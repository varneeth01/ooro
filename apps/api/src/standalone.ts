import { app } from './app.js'
import { config } from './config.js'

const address = await app.listen({ port: config.port, host: '0.0.0.0' })
app.log.info(`OORO API listening at ${address}`)

const shutdown = async () => {
  await app.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
