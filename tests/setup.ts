// Vitest setup. Pure-logic unit tests don't touch Clerk or the DB.
// Integration tests run separately against a live DATABASE_URL with
// real Clerk test users (covered by the e2e suite).
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Server-side unit tests that import route handlers must not blow up
// when they reach @clerk/nextjs/server. Mock it with an unauthenticated
// session so auth guards return 401 deterministically.
vi.mock('@clerk/nextjs/server', () => ({
  getAuth: () => ({ userId: null, sessionId: null }),
  clerkMiddleware: () => (req: any, _res: any, next: any) => next(),
}))