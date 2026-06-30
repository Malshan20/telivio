import { redirect } from 'next/navigation'

// Canonical landing experience lives at the root ("/").
// This route is kept so any existing /landing links keep working.
export default function LandingRedirect() {
  redirect('/')
}
