import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

// Ensure DATABASE_URL is set before PrismaClient attempts to load it
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
} else if (process.env.DATABASE_URL === "file:./prisma/dev.db") {
  // Prisma resolves SQLite paths relative to schema.prisma (in ./prisma),
  // so file:./prisma/dev.db causes it to look in ./prisma/prisma/dev.db.
  process.env.DATABASE_URL = "file:./dev.db";
}

// Global PrismaClient singleton to prevent multiple connections in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

