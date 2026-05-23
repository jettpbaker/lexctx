const DEFAULT_ATTEMPTS = 3
const DEFAULT_BASE_DELAY_MS = 200

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function hasTransientDbFailure(error: unknown, depth = 0): boolean {
  if (depth > 4 || error == null) {
    return false
  }

  const message = getErrorMessage(error).toLowerCase()
  if (
    message.includes('fetch failed') ||
    message.includes('error connecting to database') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('socket hang up')
  ) {
    return true
  }

  if (typeof error === 'object' && 'cause' in error) {
    return hasTransientDbFailure(error.cause, depth + 1)
  }

  return false
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number }
): Promise<T> {
  const attempts = options?.attempts ?? DEFAULT_ATTEMPTS
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS

  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      const isLastAttempt = attempt === attempts - 1
      if (isLastAttempt || !hasTransientDbFailure(error)) {
        throw error
      }

      await sleep(baseDelayMs * (attempt + 1))
    }
  }

  throw lastError
}
