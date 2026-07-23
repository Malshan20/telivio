import Groq from 'groq-sdk'
import { AIScoreResult } from '@/types'

// Lazy singleton — constructing the client at module top-level would throw
// immediately (and crash `next build`) whenever GROQ_API_KEY isn't present
// in the BUILD environment, even though this route is never actually
// invoked during the build. Next.js imports every API route module during
// its "Collecting page data" pass purely to gather metadata, so any
// top-level side effect that throws breaks the entire build — not just
// this one feature. Deferring construction until first real use means the
// build always succeeds, and a genuinely missing key only surfaces as an
// error when the AI scoring feature is actually exercised at runtime.
let _groq: Groq | null = null

function getGroqClient(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

export async function scoreResume(
  resumeText: string,
  jobTitle: string,
  jobDescription: string,
  jobRequirements: string
): Promise<AIScoreResult> {
  const prompt = `You are an expert senior recruiter with 15+ years of experience evaluating candidates. 
Analyze the following resume against the job description and requirements.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

JOB REQUIREMENTS:
${jobRequirements}

CANDIDATE RESUME:
${resumeText}

Evaluate this candidate thoroughly and return ONLY a valid JSON object (no markdown, no explanation outside JSON) with this exact structure:
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentence overall assessment explaining the score>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"]
}

Scoring guide:
- 90-100: Exceptional match, exceeds all requirements
- 75-89: Strong match, meets most requirements with relevant experience
- 60-74: Partial match, meets some requirements but has gaps
- 40-59: Weak match, significant gaps in required skills
- 0-39: Poor match, does not meet core requirements

Be objective and specific. Base scores on skills match, experience relevance, and requirement coverage.`

  const completion = await getGroqClient().chat.completions.create({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.3,
    max_tokens: 1024,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('No response from Groq AI')
  }

  try {
    // Strip any potential markdown code blocks
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned) as AIScoreResult

    // Validate the result
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      throw new Error('Invalid score from AI')
    }

    return {
      score: Math.round(result.score),
      reasoning: result.reasoning || 'No reasoning provided',
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
    }
  } catch {
    throw new Error(`Failed to parse AI response: ${content.substring(0, 200)}`)
  }
}

export async function generateRejectionEmail(
  candidateName: string,
  jobTitle: string,
  score: number
): Promise<{ subject: string; body: string }> {
  const prompt = `Write a professional, empathetic rejection email for a job candidate.

Candidate Name: ${candidateName}
Job Title: ${jobTitle}
Match Score: ${score}/100

Return ONLY a JSON object with this structure:
{
  "subject": "<email subject line>",
  "body": "<email body in plain text, 3-4 paragraphs>"
}

The email should be:
- Professional and warm
- Thank them for their time
- Be honest but kind (do not mention the score)
- Encourage them to apply for future positions
- No generic filler phrases`

  const completion = await getGroqClient().chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'openai/gpt-oss-20b',
    temperature: 0.7,
    max_tokens: 512,
  })

  const content = completion.choices[0]?.message?.content || ''
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    return {
      subject: `Your application for ${jobTitle}`,
      body: `Dear ${candidateName},\n\nThank you for taking the time to apply for the ${jobTitle} position. After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.\n\nWe appreciate your interest in joining our team and encourage you to apply for future openings that match your skills and experience.\n\nWe wish you all the best in your job search.\n\nBest regards,\nThe Recruiting Team`,
    }
  }
}
