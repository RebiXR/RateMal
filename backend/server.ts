import 'dotenv/config';
import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { lobbies, Lobby, getLobbyList, generateLobbyId } from "./lobby.ts";
import { createDrawGame, GuessingGame } from "./GuessingGame.ts";
import { DrawEvent } from "./DrawEvents.ts";
import { mirrorDrawEvent } from "./MirrorDraw.ts";
import { connectDatabase, createUser, findUserByEmail, findUserById } from "./repository/databaseService.ts";

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
const BCRYPT_ROUNDS = 10;

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters"),
    //.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    //.regex(/[a-z]/, "Password must contain at least one lowercase letter")
    //.regex(/[0-9]/, "Password must contain at least one number"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

type RegisterRequest = z.infer<typeof registerSchema>;
type LoginRequest = z.infer<typeof loginSchema>;

const httpServer = createServer(app);


const prompts = ["Haus", "Hund", "Katze", "Vogel", "Baum", "Blume", "Sonne", "Kuchen", "Pinsel", "Wolke", "Pferd", "Schmetterling", "Boot", "Apfel", "Karotte", "Hase", "Zug", "Tulpe", "Mensch", "Auto", "Stern", "Kleeblatt", "Blatt", "Maus", "Regenbogen", "Tropfen", "Schlange"];
const preposition = ["neben", "vor", "und", "mit"];
const drawingStyle = ["Comic", "Realistisch", "Schwarz Weiß", "3D"];

const io = new Server(httpServer, {
  cors: { origin: "*" },
  //increased deafault to support bigger img
  maxHttpBufferSize: 5e6, // 5 MB
});

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await findUserByEmail(data.email);
    if (existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(data.password, BCRYPT_ROUNDS);

    // Create user in database
    const newUser = await createUser({
      email: data.email,
      passwordHash,
      username: data.username,
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as jwt.SignOptions['expiresIn'] }
    );

    // Set HttpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/login
 * Login user and return JWT in HttpOnly cookie
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const data = loginSchema.parse(req.body);

    // Find user by email
    const user = await findUserByEmail(data.email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare passwords
    const isPasswordValid = await bcryptjs.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as jwt.SignOptions['expiresIn'] }
    );

    // Set HttpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// returns currently authenticated user based on token cookie

app.get('/api/auth/me', async (req: Request, res: Response) => {
  const token = req.cookies?.authToken;
  if (!token) {
    return res.status(401).json({ error: "not authenticated" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "not authenticated" });
    }
    return res.status(200).json({
      id: user.id,
      email: user.email,
      username: user.username ?? user.email.split('@')[0],
    });
  } catch {
    return res.status(401).json({ error: "not authenticated" });
  }
});

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

// socketId -> username
const usernames = new Map<string, string>();

function broadcastLobbyList() {
  io.emit("lobby-list", getLobbyList());
}

// remove socket from lobby handle delete and admin assignment
function removeParticipant(socket: Socket, lobby: Lobby) {
  if (!lobby.participants.has(socket.id)) return;

  socket.leave(lobby.id);
  lobby.participants.delete(socket.id);
  socket.to(lobby.id).emit("user disconnected", usernames.get(socket.id) ?? socket.id);

  if (lobby.adminSocketId === socket.id) {
    const remaining = Array.from(lobby.participants);
    lobby.adminSocketId = remaining.length > 0
      ? remaining[Math.floor(Math.random() * remaining.length)]
      : null;
  }

  if (lobby.participants.size === 0 && !lobby.isDefault) {
    lobbies.delete(lobby.id);
  }
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("get-lobbies", () => {
    socket.emit("lobby-list", getLobbyList())
  })

  socket.on('join-lobby', async (
    { lobbyId, username, password }: { lobbyId: string; username: string; password?: string },
    ack?: (res: { ok: boolean; error?: string }) => void
  ) => {
    const lobby = lobbies.get(lobbyId)
    if (!lobby) {
      ack?.({ ok: false, error: "lobby does not exist" })
      return
    }

    if (lobby.isPrivate) {
      const valid = !!lobby.passwordHash && await bcryptjs.compare(password ?? "", lobby.passwordHash)
      if (!valid) {
        ack?.({ ok: false, error: "incorrect password" })
        return
      }
    }

    usernames.set(socket.id, username)
    socket.join(lobbyId)
    lobby.participants.add(socket.id)
    // First user in the lobby becomes admin.
    if (lobby.adminSocketId === null) lobby.adminSocketId = socket.id

    if (!lobbyHistory.has(lobbyId)) lobbyHistory.set(lobbyId, []);
    socket.emit("canvas-sync", lobbyHistory.get(lobbyId));
    socket.to(lobbyId).emit("User connected", username)

    ack?.({ ok: true })
    broadcastLobbyList()
  });

  socket.on('create-lobby', async (
    { name, isPrivate, password, username }: { name: string; isPrivate: boolean; password?: string; username: string },
    ack?: (res: { ok: boolean; error?: string; lobbyId?: string }) => void
  ) => {
    const trimmed = (name ?? "").trim()
    if (!trimmed) {
      ack?.({ ok: false, error: "Name darf nicht leer sein" })
      return
    }
    if (isPrivate && !(password ?? "").trim()) {
      ack?.({ ok: false, error: "Passwort erforderlich" })
      return
    }

    const nameTaken = Array.from(lobbies.values())
      .some((l) => l.name.toLowerCase() === trimmed.toLowerCase())
    if (nameTaken) {
      ack?.({ ok: false, error: "Name vergeben" })
      return
    }

    const id = generateLobbyId()
    const passwordHash = isPrivate ? await bcryptjs.hash(password as string, BCRYPT_ROUNDS) : undefined

    const lobby: Lobby = {
      id,
      name: trimmed,
      isPrivate,
      passwordHash,
      isDefault: false,
      adminSocketId: socket.id,
      participants: new Set([socket.id]),
    }
    lobbies.set(id, lobby)

    // auto join on lobby create
    usernames.set(socket.id, username)
    socket.join(id)
    if (!lobbyHistory.has(id)) lobbyHistory.set(id, []);
    socket.emit("canvas-sync", lobbyHistory.get(id));

    ack?.({ ok: true, lobbyId: id })
    broadcastLobbyList()
  });

  socket.on('leave-lobby', (lobbyId: string) => {
    const lobby = lobbies.get(lobbyId)
    if (!lobby) return
    removeParticipant(socket, lobby)
    broadcastLobbyList()
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
    for (const lobby of Array.from(lobbies.values())) {
      removeParticipant(socket, lobby)
    }
    usernames.delete(socket.id)
    broadcastLobbyList()
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

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();
    httpServer.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Backend läuft auf Port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();