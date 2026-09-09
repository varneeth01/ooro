import awsLambdaFastify from '@fastify/aws-lambda'
import { app } from './app.js'
import { prismaInitialized } from './prisma.js'
import { mongoInitialized } from './lib/mongodb.js'

// Deliberately log only booleans and URL paths. Never include environment
// values, connection strings, authorization headers, or request bodies.
console.info(JSON.stringify({
  event: 'startupDiagnostics',
  functionLoaded: true,
  prismaInitialized,
  mongoInitialized: mongoInitialized(),
  routeRegistered: app.hasRoute({ method: 'GET', url: '/api/public/campaign-packages' }),
}))

export const handler = awsLambdaFastify(app)
