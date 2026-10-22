import assert from 'node:assert/strict'
import test from 'node:test'
import { app } from './server.js'

test('retired payment routes reject without provider or database access', async () => {
  for (const url of ['/api/public/campaign-orders', '/api/public/campaign-orders/verify', '/api/webhooks/razorpay']) {
    const response = await app.inject({ method: 'POST', url, payload: { event: 'payment.captured', amount: 1 } })
    assert.equal(response.statusCode, 410, `${url}: ${response.body}`)
    assert.equal(response.json().error.code, 'PAYMENT_PROCESSING_RETIRED')
  }
})
