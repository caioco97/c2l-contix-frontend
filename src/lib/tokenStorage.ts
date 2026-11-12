import type { AuthTokens } from '@/types/auth'

const KEY = 'contix.auth'

/**
 * Persistência dos tokens. O access token fica em memória e em localStorage
 * para sobreviver a um reload; quando a API passar a emitir o refresh token
 * em cookie httpOnly, basta remover o refreshToken daqui.
 */
let cache: AuthTokens | null = read()

function read(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as AuthTokens) : null
  } catch {
    return null
  }
}

export const tokenStorage = {
  get: () => cache,
  set(tokens: AuthTokens) {
    cache = tokens
    try {
      localStorage.setItem(KEY, JSON.stringify(tokens))
    } catch {
      /* armazenamento indisponível: segue só em memória */
    }
  },
  clear() {
    cache = null
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  },
}
