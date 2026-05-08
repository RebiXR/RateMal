import 'dotenv/config';
import { MongoClient, ServerApiVersion, ObjectId, Db, Collection } from 'mongodb';
import { User, IUser, CreateUserDTO, UserResponseDTO } from './user.ts';

const uri = process.env.MONGODB_URI || "mongodb+srv://eingeiger:<db_password>@ratemaldb.bbp0f9s.mongodb.net/?appName=RateMalDB";
const databaseName = "RateMalDB";
const usersCollectionName = "users";

let client: MongoClient | null = null;
let db: Db | null = null;
let usersCollection: Collection<IUser> | null = null;

/**
 * Initialize database connection
 */
export async function connectDatabase(): Promise<void> {
  if (client && db) {
    console.log("Database already connected");
    return;
  }

  try {
    client = new MongoClient(uri, {
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

    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
}

/**
 * Create database indexes
 */
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

/**
 * Close database connection
 */
export async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    usersCollection = null;
    console.log("Database connection closed");
  }
}

/**
 * Get users collection (ensure it's initialized)
 */
function getUsersCollection(): Collection<IUser> {
  if (!usersCollection) {
    throw new Error("Database not connected. Call connectDatabase() first.");
  }
  return usersCollection;
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserDTO): Promise<UserResponseDTO> {
  const collection = getUsersCollection();
  const user = new User(userData.email, userData.passwordHash, userData.username);

  const result = await collection.insertOne(user as any);

  if (!result.insertedId) {
    throw new Error("Failed to insert user");
  }

  return user.toJSON() as UserResponseDTO;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<IUser | null> {
  const collection = getUsersCollection();
  return await collection.findOne({ id } as any);
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<IUser | null> {
  const collection = getUsersCollection();
  return await collection.findOne({ email });
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<IUser[]> {
  const collection = getUsersCollection();
  return await collection.find({}).toArray();
}

/**
 * Update user
 */
export async function updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
  const collection = getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { id } as any,
    { $set: updates },
    { returnDocument: 'after' }
  );

  return result || null;
}

/**
 * Delete user by ID
 */
export async function deleteUserById(id: string): Promise<boolean> {
  const collection = getUsersCollection();
  const result = await collection.deleteOne({ id } as any);
  return result.deletedCount > 0;
}

/**
 * Delete user by email
 */
export async function deleteUserByEmail(email: string): Promise<boolean> {
  const collection = getUsersCollection();
  const result = await collection.deleteOne({ email });
  return result.deletedCount > 0;
}

/**
 * Check if user exists by email
 */
export async function userExists(email: string): Promise<boolean> {
  const collection = getUsersCollection();
  const user = await collection.findOne({ email });
  return user !== null;
}

/**
 * Update user password
 */
export async function updateUserPassword(id: string, newPasswordHash: string): Promise<IUser | null> {
  return await updateUser(id, { passwordHash: newPasswordHash });
}

/**
 * Update user username
 */
export async function updateUsername(id: string, username: string): Promise<IUser | null> {
  return await updateUser(id, { username });
}

/**
 * Get user count
 */
export async function getUserCount(): Promise<number> {
  const collection = getUsersCollection();
  return await collection.countDocuments();
}
