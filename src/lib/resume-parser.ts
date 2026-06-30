/**
 * Extracts plain text from an uploaded resume file so the AI agent has
 * something to score. Supports PDF and DOCX; falls back gracefully for
 * anything else (plain .txt is just read directly by the caller).
 */
export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase()

  try {
    if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
      // Lazy import — pdf-parse touches the filesystem on import in some
      // environments, so we only pull it in when actually needed.
      const pdfParse = (await import('pdf-parse')).default
      const result = await pdfParse(buffer)
      return result.text.trim()
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lower.endsWith('.docx')
    ) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value.trim()
    }

    if (mimeType === 'text/plain' || lower.endsWith('.txt')) {
      return buffer.toString('utf-8').trim()
    }

    // .doc (legacy binary Word format) isn't reliably parseable without a
    // heavier dependency — return empty and let the caller decide how to
    // handle it (e.g. ask the candidate to re-upload as PDF/DOCX).
    return ''
  } catch (err) {
    console.error('Resume text extraction failed:', err)
    return ''
  }
}

export const ACCEPTED_RESUME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

export const ACCEPTED_RESUME_EXTENSIONS = ['.pdf', '.docx', '.txt']

export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
