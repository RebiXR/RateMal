import "dotenv/config";
import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { createLobby, deleteLobby, getLobbyList, lobbies } from "./lobby.ts"
import { createDrawGame, GuessingGame } from "./GuessingGame.ts";
import { DrawEvent } from "./DrawEvents.ts";
import { mirrorDrawEvent } from "./MirrorDraw.ts";
import { connectDatabase, createUser, findUserByEmail } from "./repository/databaseService.ts";


const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "rate-mal-dev-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
const BCRYPT_ROUNDS = 10;

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const httpServer = createServer(app);


const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mensch", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["neben", "vor", "und", "mit"];
const drawingStyle = ["Comic", "Realistisch", "Schwarz Weiß", "3D"];

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await findUserByEmail(data.email);

    if (existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const passwordHash = await bcryptjs.hash(data.password, BCRYPT_ROUNDS);
    const newUser = await createUser({
      email: data.email,
      passwordHash,
      username: data.username,
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as jwt.SignOptions["expiresIn"] }
    );

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await findUserByEmail(data.email);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcryptjs.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as jwt.SignOptions["expiresIn"] }
    );

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("authToken");
  res.status(200).json({ message: "Logout successful" });
});

// not nomalized 
/**type PointN = { x: number; y: number }; // normalized 0..1

type LineDrawEvent ={
  type:"line";
  from: PointN;
  to:PointN;
  color:string;
  width:number;
};
/*type BlobDrawEvent ={
  type:"blob";
  x: number;
  y:number;
  color:string;
};
};*/



//type DrawEvent = LineDrawEvent| ShapeDrawEvent;

// Zeichen-History pro Lobby (damit neue Joiner den aktuellen Canvas sehen)
const lobbyHistory = new Map<string, DrawEvent[]>();

// for mirrored drawing option
const lobbyMirrorMode = new Map<string, boolean>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("get-lobbies", () => {
    socket.emit("lobby-list", getLobbyList())
  })

  socket.on("create-lobby", () => {
    createLobby();
    io.emit("lobby-list", getLobbyList());
  })

  socket.on("delete-lobby", (lobbyId: string) => {
    if (!lobbyId || !deleteLobby(lobbyId)) return;

    lobbyHistory.delete(lobbyId);
    lobbyMirrorMode.delete(lobbyId);
    io.to(lobbyId).emit("canvas-sync", []);
    io.to(lobbyId).emit("lobby-deleted", lobbyId);
    io.emit("lobby-list", getLobbyList());
  })

  socket.on('join-lobby', (lobbyId: string, userId: string) => {
    const lobby = lobbies.get(lobbyId)
    if (!lobby) return

    socket.join(lobbyId)
    lobby.participants.add(socket.id)
    if (!lobbyHistory.has(lobbyId)) lobbyHistory.set(lobbyId, []);
    socket.emit("canvas-sync", lobbyHistory.get(lobbyId));
    socket.to(lobbyId).emit("User connected", userId)
    io.emit("lobby-list", getLobbyList());
  });

  socket.on("draw", ({ lobbyId, data, canvasWidth }: { lobbyId: string; data: DrawEvent; canvasWidth?:number }) => {
    if (!lobbyId) return;

    // speichern für spätere Joiner
    const hist = lobbyHistory.get(lobbyId) ?? [];

// for mirrored option:
    const mirrorMode = lobbyMirrorMode.get(lobbyId) ?? false; // false by default if nothing is picked

    if (mirrorMode && canvasWidth) {
    const mirrored = mirrorDrawEvent(data, canvasWidth);

    hist.push(data, mirrored);
    lobbyHistory.set(lobbyId, hist);

    socket.to(lobbyId).emit("draw", data);
    socket.to(lobbyId).emit("draw", mirrored);

    socket.emit("draw", mirrored);
    }else {    
    hist.push(data);

    // optional: begrenzen, damit RAM nicht unendlich wächst
    // if (hist.length > 50_000) hist.splice(0, hist.length - 50_000);
    lobbyHistory.set(lobbyId, hist);

    socket.to(lobbyId).emit("draw", data)
  }
  })

  socket.on("undo-draw", (lobbyId: string) => {
    if (!lobbyId) return;

    const hist = lobbyHistory.get(lobbyId) ?? [];
    const lastEvent = hist[hist.length - 1];
    if (!lastEvent) return;

    const lastActionId = lastEvent.actionId ?? (lastEvent.type === "line" ? lastEvent.strokeId : undefined);

    if (lastActionId) {
      while (hist.length > 0) {
        const event = hist[hist.length - 1];
        const actionId = event.actionId ?? (event.type === "line" ? event.strokeId : undefined);
        if (actionId !== lastActionId) break;
        hist.pop();
      }
    } else {
      const mirrorMode = lobbyMirrorMode.get(lobbyId) ?? false;
      hist.splice(Math.max(0, hist.length - (mirrorMode ? 2 : 1)), mirrorMode ? 2 : 1);
    }

    lobbyHistory.set(lobbyId, hist);
    io.to(lobbyId).emit("canvas-sync", hist);
  })


  //-------------------------------------
  //for the group: 


  socket.on("newGroupPrompt", () => {
    const randomPrompt = (prompts[Math.floor(Math.random() * prompts.length)] + " " + preposition[Math.floor(Math.random()*preposition.length)] + " " + prompts[Math.floor(Math.random()* prompts.length)] + " im Stil: " + drawingStyle[Math.floor(Math.random()*drawingStyle.length)]);
  
    // für die anderen spieler
    io.emit("groupPrompt", randomPrompt);
  });



  socket.on("generate-pbn", async ({ lobbyId, image, difficulty }: { lobbyId: string; image: string; difficulty?: number }) => {
    if (!lobbyId || !image) return;

    try {
      const response = await fetch("http://127.0.0.1:8000/processPicture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, difficulty: difficulty ?? 5 }),
      });

      if (!response.ok) {
        socket.emit("pbn-error", { message: "PBN generation failed" });
        return;
      }

      const result = await response.json();
      io.to(lobbyId).emit("pbn-ready", result);
    } catch {
      socket.emit("pbn-error", { message: "Could not reach PBN service" });
    }
  });

  socket.on("disconnect", () => {
    let lobbyChanged = false;
    for(const lobby of lobbies.values()) {
      if(lobby.participants.delete(socket.id)){
        socket.to(lobby.id).emit("User disconnected", socket.id)
        lobbyChanged = true;
      }
    }
    if (lobbyChanged) {
      io.emit("lobby-list", getLobbyList());
    }
    console.log("User disconnected:", socket.id);
  });

  socket.on("createGuessingGame", (lobbyId: string) => {
    const lobby = lobbies.get(lobbyId)
    if (!lobby){
      socket.emit("No Lobby")
      return
    }
    // get random item from a Set
    function getRandomItem(set: Set<string>) {
        let items = Array.from(set);
        return items[Math.floor(Math.random() * items.length)];
    }

    const participants: Set<string> = lobby?.participants
    const host: string = getRandomItem(participants)

    const guessingGame = createDrawGame()
    guessingGame.participants = participants
    guessingGame.drawMasterId = host

    const guessingGameLobby = new Map<string, GuessingGame>()
    guessingGameLobby.set(lobbyId, guessingGame)

    io.to(lobbyId).emit("drawGuessGame", {
        id: guessingGame.id,
        drawPrompt: guessingGame.drawPrompt,
        drawMasterId: guessingGame.drawMasterId!,
        participants: Array.from(guessingGame.participants),
        answerOptions: Array.from(guessingGame.answers)
      
    })
  })

  socket.on("toggleMirrorMode", (lobbyId: string) => {
  const next = !(lobbyMirrorMode.get(lobbyId) ?? false);
  lobbyMirrorMode.set(lobbyId, next);

  io.to(lobbyId).emit("mirrorModeChanged", next);
});


});

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  try {
    await connectDatabase();
    httpServer.listen(PORT, "0.0.0.0", () => console.log(`Backend läuft auf Port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
