import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext, getOrgBillingContext } from '@/lib/org-context'
import { getPlan } from '@/lib/plans'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, interview_threshold, plan, white_label_enabled, white_label_display_name, white_label_accent_color')
      .eq('id', ctx.organizationId)
      .single()

    if (error) throw error

    return NextResponse.json({ ...data, role: ctx.role })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getOrgBillingContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RLS also enforces this (only 'owner' can UPDATE organizations), but
    // checking here first lets us return a clear message instead of a
    // confusing "0 rows updated" silent no-op.
    if (ctx.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the workspace owner can update organization settings' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (!body.name || body.name.trim().length < 2) {
        return NextResponse.json({ error: 'Company name must be at least 2 characters' }, { status: 400 })
      }
      updates.name = body.name.trim()
    }

    if (body.interview_threshold !== undefined) {
      const threshold = Number(body.interview_threshold)
      if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
        return NextResponse.json({ error: 'Threshold must be a whole number between 0 and 100' }, { status: 400 })
      }
      updates.interview_threshold = threshold
    }

    // White-label fields — Agency plan only.
    if (
      body.white_label_enabled !== undefined ||
      body.white_label_display_name !== undefined ||
      body.white_label_accent_color !== undefined
    ) {
      if (!getPlan(ctx.plan).features.whiteLabel) {
        return NextResponse.json(
          { error: 'White-label branding is available on the Agency plan.', code: 'feature_locked' },
          { status: 402 }
        )
      }

      if (body.white_label_enabled !== undefined) {
        updates.white_label_enabled = !!body.white_label_enabled
      }
      if (body.white_label_display_name !== undefined) {
        updates.white_label_display_name = String(body.white_label_display_name).trim().slice(0, 100) || null
      }
      if (body.white_label_accent_color !== undefined) {
        const color = String(body.white_label_accent_color).trim()
        if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
          return NextResponse.json({ error: 'Accent color must be a hex code like #6D5BFF' }, { status: 400 })
        }
        updates.white_label_accent_color = color || null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', ctx.organizationId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update organization' },
      { status: 500 }
    )
  }
}
