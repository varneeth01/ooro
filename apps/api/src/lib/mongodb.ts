import mongoose from 'mongoose'
import { config } from '../config.js'

let connectionPromise: Promise<typeof mongoose> | null = null

export const mongoInitialized = () => mongoose.connection.readyState === 1

export async function connectMongo() {
  if (!config.mongodbUri) throw new Error('MONGODB_URI is not configured')
  if (mongoose.connection.readyState === 1) return mongoose
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 }).catch((error) => {
      connectionPromise = null
      throw error
    })
  }
  return connectionPromise
}

export function mongoConfigured() { return Boolean(config.mongodbUri) }
