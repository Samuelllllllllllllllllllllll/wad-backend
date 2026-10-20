// src/lib/mongodb.js

import { MongoClient } from "mongodb";

const options = {};

// Cache the connection on `globalThis` in every environment so that
// serverless invocations (Vercel) and dev hot-reloads reuse one client.
export function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please add your Mongo URI to .env.local or set MONGODB_URI env variable",
    );
  }
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    globalThis._mongoClientPromise = client.connect().catch((err) => {
      globalThis._mongoClientPromise = undefined;
      throw err;
    });
  }
  return globalThis._mongoClientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB || "online_course");
}
