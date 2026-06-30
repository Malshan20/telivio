import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Next.js 16 renamed middleware.ts -> proxy.ts. Functionally this is the
 * same hook that used to be called "middleware" — it still intercepts
 * every matched request before it reaches a route — but it now runs on
 * the Node.js runtime instead of the Edge runtime. That's a meaningful
 * improvement for us specifically: our logic here calls Supabase
 * (`getUser()`, a `users` table lookup for org-checks), and the Node
 * runtime has fuller compatibility with `@supabase/ssr` than Edge did.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
