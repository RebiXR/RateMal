import 'dotenv/config';
import { MongoClient, ServerApiVersion, ObjectId, Db, Collection } from 'mongodb';
import { User, IUser, CreateUserDTO, UserResponseDTO } from './user.ts';

const uri = process.env.MONGODB_URI as string;
const databaseName = "RateMalDB";
const usersCollectionName = "users";

let client: MongoClient | null = null;
let db: Db | null = null;
let usersCollection: Collection<IUser> | null = null;

export async function connectDatabase(): Promise<void> {
  if (client && db) {
    console.log("Database already connected");
    return;
  }

  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await client.connect();
    db = client.db(databaseName);
    usersCollection = db.collection<IUser>(usersCollectionName);

    // Verify connection
    await db.admin().command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    await createIndexes();
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
}

async function createIndexes(): Promise<void> {
  if (!usersCollection) throw new Error("Users collection not initialized");

  try {
    // Create unique index on email
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log("Database indexes created");
  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    usersCollection = null;
    console.log("Database connection closed");
  }
}

function getUsersCollection(): Collection<IUser> {
  if (!usersCollection) {
    throw new Error("Database not connected. Call connectDatabase() first.");
  }
  return usersCollection;
}

export async function createUser(userData: CreateUserDTO): Promise<UserResponseDTO> {
  const collection = getUsersCollection();
  const user = new User(userData.email, userData.passwordHash, userData.username);

  const result = await collection.insertOne(user as any);

  if (!result.insertedId) {
    throw new Error("Failed to insert user");
  }

  return user.toJSON() as UserResponseDTO;
}

export async function findUserById(id: string): Promise<IUser | null> {
  const collection = getUsersCollection();
  return await collection.findOne({ id } as any);
}

export async function findUserByEmail(email: string): Promise<IUser | null> {
  const collection = getUsersCollection();
  return await collection.findOne({ email });
}

export async function getAllUsers(): Promise<IUser[]> {
  const collection = getUsersCollection();
  return await collection.find({}).toArray();
}

export async function updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
  const collection = getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { id } as any,
    { $set: updates },
    { returnDocument: 'after' }
  );

  return result || null;
}

export async function deleteUserById(id: string): Promise<boolean> {
  const collection = getUsersCollection();
  const result = await collection.deleteOne({ id } as any);
  return result.deletedCount > 0;
}

export async function deleteUserByEmail(email: string): Promise<boolean> {
  const collection = getUsersCollection();
  const result = await collection.deleteOne({ email });
  return result.deletedCount > 0;
}

export async function userExists(email: string): Promise<boolean> {
  const collection = getUsersCollection();
  const user = await collection.findOne({ email });
  return user !== null;
}

export async function updateUserPassword(id: string, newPasswordHash: string): Promise<IUser | null> {
  return await updateUser(id, { passwordHash: newPasswordHash });
}

export async function updateUsername(id: string, username: string): Promise<IUser | null> {
  return await updateUser(id, { username });
}

export async function getUserCount(): Promise<number> {
  const collection = getUsersCollection();
  return await collection.countDocuments();
}
