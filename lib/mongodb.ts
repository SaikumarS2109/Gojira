import mongoose from 'mongoose';
import dns from 'dns';

// Node.js fails to resolve DNS via IPv6 link-local (fe80::1); force IPv4 DNS servers
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

let cached = global.mongoose as any;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Force IPv4 DNS servers — system default (fe80::1) is IPv6 link-local and fails in Node.js
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('DNS servers before connect:', dns.getServers());
    cached.promise = mongoose
      .connect(MONGODB_URI!, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then((result) => {
        cached.conn = result;
        return result;
      })
      .catch((error) => {
        // Don't cache failed connections
        cached.promise = null;
        throw error;
      });
  }

  return await cached.promise;
}
