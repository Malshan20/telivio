import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public auth-related routes — always allow through regardless of session
  // state. /reset-password needs special treatment: the user IS authenticated
  // (Supabase exchanged the recovery code into a session in /api/auth/callback)
  // but they haven't set a new password yet, so we must never redirect them
  // to the dashboard before they complete the form.
  const alwaysPublic = ['/reset-password', '/apply']
  if (alwaysPublic.some((p) => path === p || path.startsWith(p + '/'))) {
    return supabaseResponse
  }

  // Protect dashboard routes — require auth
  if (!user && path.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Onboarding also requires auth (you must be signed in to name your company)
  if (!user && path === '/onboarding') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Redirect logged-in users away from the login page straight to the dashboard
    if (path === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Gate /dashboard/* behind onboarding: a logged-in user with no
    // organization yet gets sent to set one up first, on every dashboard
    // route, not just the index page.
    if (path.startsWith('/dashboard')) {
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    }

    // Once onboarding is done, don't let them revisit the onboarding form.
    if (path === '/onboarding') {
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  // Note: '/' is intentionally left alone here — src/app/page.tsx handles
  // routing logged-in users to /dashboard and everyone else to /landing.
  // '/landing', '/pricing' and other public routes always pass through.

  return supabaseResponse
}
