import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from './prisma.js'
import { requirePermission, response } from './http.js'
import { adminRoles } from './domain/admin-auth.js'

/** Phase 2 foundation: Super Admin-only read access with a strict field allowlist. */
export function registerAdminManagement(app: FastifyInstance) {
  app.get('/api/admin/users', async (request, reply) => {
    await requirePermission(request, 'admin-users:manage')
    const query = z.object({
      skip: z.coerce.number().int().min(0).max(100000).default(0),
      take: z.coerce.number().int().min(1).max(100).default(25),
    }).parse(request.query)
    const where = { role: { in: adminRoles } }
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, accountStatus: true,
          passwordChangedAt: true, lockedUntil: true, createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }, skip: query.skip, take: query.take,
      }),
      prisma.user.count({ where }),
    ])
    return reply.send(response(request, { users, total, skip: query.skip, take: query.take }))
  })
}
