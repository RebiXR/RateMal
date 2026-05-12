import "dotenv/config";
import { Db, Collection, MongoClient, ServerApiVersion } from "mongodb";
import { User, type CreateUserDTO, type IUser, type UserResponseDTO } from "./user.ts";

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DATABASE || "RateMalDB";
const usersCollectionName = "users";

let client: MongoClient | null = null;
let db: Db | null = null;
let usersCollection: Collection<IUser> | null = null;
const memoryUsers = new Map<string, IUser>();

export async function connectDatabase(): Promise<void> {
  if (!uri) {
    console.log("MONGODB_URI is not set. Auth uses in-memory dev storage.");
    return;
  }

  if (client && db) {
    return;
  }

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  db = client.db(databaseName);
  usersCollection = db.collection<IUser>(usersCollectionName);
  await db.admin().command({ ping: 1 });
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  console.log("Successfully connected to MongoDB.");
}

export async function disconnectDatabase(): Promise<void> {
  if (!client) return;

  await client.close();
  client = null;
  db = null;
  usersCollection = null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getUsersCollection(): Collection<IUser> | null {
  return usersCollection;
}

export async function createUser(userData: CreateUserDTO): Promise<UserResponseDTO> {
  const user = new User(
    normalizeEmail(userData.email),
    userData.passwordHash,
    userData.username
  );
  const collection = getUsersCollection();

  if (collection) {
    await collection.insertOne(user);
  } else {
    memoryUsers.set(user.email, user);
  }

  return user.toJSON();
}

export async function findUserByEmail(email: string): Promise<IUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const collection = getUsersCollection();

  if (collection) {
    return await collection.findOne({ email: normalizedEmail });
  }

  return memoryUsers.get(normalizedEmail) ?? null;
}

export async function userExists(email: string): Promise<boolean> {
  return (await findUserByEmail(email)) !== null;
}
