import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'recruiting@telivio.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Minimal HTML escaping for org-supplied template overrides (custom
 * subject lines / intro paragraphs, Growth+ feature). These values come
 * from an HR user's own settings, not a public form, but they still get
 * interpolated directly into HTML sent to a third party (the candidate),
 * so they're escaped the same way any other untrusted string going into
 * HTML would be.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Replaces {{token}} placeholders in a template override string. */
function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match)
}

export async function sendInterviewInvite({
  candidateName,
  candidateEmail,
  jobTitle,
  schedulingLink,
  companyName = 'Our Company',
  customSubject,
  customIntro,
}: {
  candidateName: string
  candidateEmail: string
  jobTitle: string
  schedulingLink: string
  companyName?: string
  /** Growth+ override: replaces the default subject line. May reference {{jobTitle}} and {{companyName}}. */
  customSubject?: string
  /** Growth+ override: replaces the "Congratulations! ..." paragraph. Plain text, one paragraph. */
  customIntro?: string
}): Promise<{ id?: string; error?: string }> {
  try {
    const subject = customSubject
      ? interpolate(customSubject, { jobTitle, companyName })
      : `Interview Invitation — ${jobTitle} at ${companyName}`

    const introParagraph = customIntro
      ? escapeHtml(interpolate(customIntro, { jobTitle, companyName, candidateName }))
      : `Congratulations! After reviewing your application for the <strong>${jobTitle}</strong> position, we're excited to invite you to an interview. Your background impressed our team and we'd love to learn more about you.`

    const { data, error } = await resend.emails.send({
      from: `${companyName} Recruiting <${FROM_EMAIL}>`,
      to: candidateEmail,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #5b63f8 0%, #4645ed 100%); padding: 40px 40px 32px;">
      <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <span style="color: white; font-size: 20px;">⚡</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">You're Moving Forward!</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 15px;">Interview invitation for ${jobTitle}</p>
    </div>
    
    <div style="padding: 40px;">
      <p style="color: #3b3e56; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Hi <strong>${candidateName}</strong>,
      </p>
      
      <p style="color: #555a7a; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        ${introParagraph}
      </p>
      
      <p style="color: #555a7a; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
        Please use the link below to schedule your interview at a time that works best for you:
      </p>
      
      <div style="text-align: center; margin: 0 0 32px;">
        <a href="${schedulingLink}" 
           style="display: inline-block; background: linear-gradient(135deg, #5b63f8 0%, #4645ed 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: -0.2px;">
          Schedule Your Interview →
        </a>
      </div>
      
      <div style="background: #f8f9fc; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
        <p style="color: #555a7a; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong style="color: #3b3e56;">What to expect:</strong><br>
          • 45-60 minute video call<br>
          • Discussion about your experience and the role<br>
          • Opportunity for you to ask questions<br>
          • Link expires in 7 days
        </p>
      </div>
      
      <p style="color: #9095b3; font-size: 13px; margin: 0;">
        Questions? Reply to this email and we'll get back to you.<br>
        <br>
        Best regards,<br>
        <strong style="color: #555a7a;">${companyName} Recruiting Team</strong>
      </p>
    </div>
    
    <div style="background: #f8f9fc; padding: 20px 40px; border-top: 1px solid #e4e6ef;">
      <p style="color: #9095b3; font-size: 12px; margin: 0; text-align: center;">
        Powered by <strong>Telivio</strong> — Autonomous AI Recruiting
      </p>
    </div>
  </div>
</body>
</html>`,
    })

    if (error) {
      return { error: error.message }
    }

    return { id: data?.id }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}

export async function sendRejectionEmail({
  candidateName,
  candidateEmail,
  jobTitle,
  subject,
  body,
  companyName = 'Our Company',
  customSubject,
}: {
  candidateName: string
  candidateEmail: string
  jobTitle: string
  subject: string
  body: string
  companyName?: string
  /** Growth+ override: replaces the AI-generated subject line entirely. May reference {{jobTitle}} and {{companyName}}. */
  customSubject?: string
}): Promise<{ id?: string; error?: string }> {
  try {
    const finalSubject = customSubject
      ? interpolate(customSubject, { jobTitle, companyName })
      : subject

    const htmlBody = body
      .split('\n\n')
      .map((p) => `<p style="color: #555a7a; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('')

    const { data, error } = await resend.emails.send({
      from: `${companyName} Recruiting <${FROM_EMAIL}>`,
      to: candidateEmail,
      subject: finalSubject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #3b3e56; padding: 32px 40px;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">Regarding Your Application</h1>
      <p style="color: rgba(255,255,255,0.6); margin: 6px 0 0; font-size: 14px;">${jobTitle}</p>
    </div>
    
    <div style="padding: 40px;">
      ${htmlBody}
      
      <p style="color: #9095b3; font-size: 13px; margin: 24px 0 0;">
        <strong style="color: #555a7a;">${companyName} Recruiting Team</strong>
      </p>
    </div>
    
    <div style="background: #f8f9fc; padding: 20px 40px; border-top: 1px solid #e4e6ef;">
      <p style="color: #9095b3; font-size: 12px; margin: 0; text-align: center;">
        Powered by <strong>Telivio</strong> — Autonomous AI Recruiting
      </p>
    </div>
  </div>
</body>
</html>`,
    })

    if (error) {
      return { error: error.message }
    }

    return { id: data?.id }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}

export { resend }
