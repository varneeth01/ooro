import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
// Prisma opens its database connection lazily on first query. Keeping this
// explicit lets the serverless startup diagnostic distinguish client loading
// from an actual database connection.
export const prismaInitialized = true
