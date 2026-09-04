import test from 'node:test'
import assert from 'node:assert/strict'
import { packageFor } from './campaign-packages.js'

test('server owns Tirupati package prices', () => { assert.equal(packageFor('TPT_30D_8H_10')?.amount, 10000); assert.equal(packageFor('TPT_30D_4H_25')?.amount, 15000) })
test('unknown and inactive packages are rejected', () => { assert.equal(packageFor('TPT_30D_8H_999'), undefined) })
