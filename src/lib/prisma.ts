// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

export const client = new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).prisma = client;
}