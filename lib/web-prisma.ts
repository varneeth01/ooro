import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { webPrisma?: PrismaClient };
export const webPrisma = globalForPrisma.webPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.webPrisma = webPrisma;
