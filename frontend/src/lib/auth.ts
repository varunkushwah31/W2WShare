/**
 * W2W Share - User & Node Authentication Store
 */

export interface AuthUser {
  nodeId: string
  token: string
  role?: string
  authenticatedAt: number
}

const AUTH_STORAGE_KEY = 'w2w_node_auth'

type AuthListener = (user: AuthUser | null) => void
const listeners: Set<AuthListener> = new Set()

export const authStore = {
  getUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // Ignore
    }
    return null
  },

  isLoggedIn(): boolean {
    return !!this.getUser()
  },

  login(nodeId: string, token: string, role = 'NODE_OPERATOR'): AuthUser {
    const user: AuthUser = {
      nodeId: nodeId.trim(),
      token: token.trim(),
      role,
      authenticatedAt: Date.now(),
    }
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    } catch {
      // Ignore
    }
    listeners.forEach((cb) => cb(user))
    return user
  },

  logout(): void {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // Ignore
    }
    listeners.forEach((cb) => cb(null))
  },

  subscribe(listener: AuthListener): () => void {
    listeners.add(listener)
    listener(this.getUser())
    return () => {
      listeners.delete(listener)
    }
  },
}
