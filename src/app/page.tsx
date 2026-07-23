import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingContent from '@/components/landing/LandingContent'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    redirect(profile?.organization_id ? '/dashboard' : '/onboarding')
  }

  return <LandingContent />
}
