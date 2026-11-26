import { connections, connect, mongo } from "mongoose";
import { normalizeMongoUri } from "./mongo-uri";

const DB_NAME = process.env.MONGODB_DB_NAME ?? "sironic_erp";

function getMongoUri(): string | undefined {
  const raw = process.env.MONGODB_URI?.trim();
  return raw ? normalizeMongoUri(raw) : undefined;
}

if (!getMongoUri()) {
  console.warn("MONGODB_URI is not set — database operations will fail at runtime");
}

let connectionPromise: Promise<typeof import("mongoose")> | null = null;

export async function connectDB(): Promise<void> {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }

  if (connections[0]?.readyState === 1) {
    return;
  }

  if (connectionPromise) {
    await connectionPromise;
    return;
  }

  try {
    connectionPromise = connect(mongoUri, {
      dbName: DB_NAME,
      retryWrites: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
    } as Parameters<typeof connect>[1]);

    await connectionPromise;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
}

let _nativeClient: mongo.MongoClient | null = null;

export function getNativeClient(): mongo.MongoClient {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!_nativeClient) {
    _nativeClient = new mongo.MongoClient(mongoUri);
  }
  return _nativeClient;
}

let _uploadsBucket: mongo.GridFSBucket | null = null;

export function getUploadsBucket(): mongo.GridFSBucket {
  if (!_uploadsBucket) {
    const client = getNativeClient();
    _uploadsBucket = new mongo.GridFSBucket(client.db(DB_NAME), {
      bucketName: "uploads",
    });
  }
  return _uploadsBucket;
}

const _buckets = new Map<string, mongo.GridFSBucket>();

/**
 * A named GridFS bucket other than the shared `uploads` one — for files that must not be
 * reachable through the médiatár or its public file route (e.g. HR's `hr-files`,
 * docs/ARCHITECTURE.md §7.5).
 */
export function getGridFsBucket(bucketName: string): mongo.GridFSBucket {
  let bucket = _buckets.get(bucketName);
  if (!bucket) {
    bucket = new mongo.GridFSBucket(getNativeClient().db(DB_NAME), { bucketName });
    _buckets.set(bucketName, bucket);
  }
  return bucket;
}

export { DB_NAME };
