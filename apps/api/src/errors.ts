export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode = 400) {
    super(message)
  }
}

export const notFound = (message = 'Resource not found') => new ApiError('NOT_FOUND', message, 404)
export const unauthorized = (message = 'Authentication required') => new ApiError('UNAUTHORIZED', message, 401)
export const forbidden = (message = 'You do not have permission to perform this action') => new ApiError('FORBIDDEN', message, 403)
