'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  Zap, Briefcase, MapPin, Clock, CheckCircle2, Loader2, Building2,
  Upload, FileText, X, DollarSign, Calendar, Globe2,
} from 'lucide-react'

interface PublicJob {
  id: string
  title: string
  description: string
  requirements: string
  department?: string
  location?: string
  employment_type?: string
  salary_range?: string
  status: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt']

export default function ApplyPage() {
  const params = useParams()
  const jobId = params.jobId as string
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [job, setJob] = useState<PublicJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [branding, setBranding] = useState<{ enabled: boolean; displayName?: string; accentColor?: string | null }>({ enabled: false })

  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resumeData, setResumeData] = useState<{
    resume_url: string
    resume_filename: string
    resume_text: string
  } | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    salary_expectation: '',
    years_experience: '',
    earliest_start_date: '',
    work_authorization: '',
    linkedin_url: '',
    portfolio_url: '',
    cover_note: '',
  })

  useEffect(() => {
    async function fetchJob() {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, description, requirements, department, location, employment_type, salary_range, status')
        .eq('id', jobId)
        .eq('status', 'active')
        .single()

      setJob(error || !data ? null : data)
      setLoading(false)
    }
    async function fetchBranding() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/branding`)
        const data = await res.json()
        setBranding(data)
      } catch {
        // Non-fatal — page renders with default Telivio branding either way.
      }
    }
    fetchJob()
    fetchBranding()
  }, [jobId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validateFile(file: File): string | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return 'Please upload a PDF, DOCX, or TXT file'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large — max 10MB'
    }
    return null
  }

  async function uploadResume(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setResumeFile(file)
    setUploadingResume(true)
    setResumeData(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('jobId', jobId)

      const res = await fetch('/api/candidates/upload-resume', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResumeData({
        resume_url: data.resumeUrl,
        resume_filename: data.resumeFilename,
        resume_text: data.resumeText,
      })

      if (!data.textExtracted) {
        toast(
          'Resume uploaded, but we couldn\'t read its text automatically. You can still submit — a recruiter will review it manually.',
          { icon: '⚠️', duration: 5000 }
        )
      } else {
        toast.success('Resume uploaded')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload resume')
      setResumeFile(null)
    } finally {
      setUploadingResume(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadResume(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadResume(file)
  }

  function removeResume() {
    setResumeFile(null)
    setResumeData(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name || !form.email) {
      toast.error('Please fill in your name and email')
      return
    }

    if (!resumeData) {
      toast.error('Please upload your resume before submitting')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          job_id: jobId,
          resume_url: resumeData.resume_url,
          resume_filename: resumeData.resume_filename,
          resume_text: resumeData.resume_text,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed')
      }

      setSubmitted(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <Briefcase className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Job Not Found</h1>
          <p className="text-surface-400">This position is no longer active or doesn't exist.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-8">
        <div className="text-center max-w-md animate-slide-up">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Application Received!</h1>
          <p className="text-surface-400 mb-4">
            Thank you for applying for <strong className="text-white">{job.title}</strong>.
            Our AI agent is reviewing your application and you'll hear from us soon.
          </p>
          <div className="card p-4 text-left space-y-2">
            <p className="text-xs text-surface-400 font-medium uppercase tracking-wider">What happens next</p>
            {[
              'AI agent reviews and scores your resume',
              'You\'ll receive an email with the decision',
              'Top candidates get an interview invite',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-600/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-surface-300">{step}</span>
              </div>
            ))}
          </div>
          {!branding.enabled && (
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-surface-600">
              <Zap className="w-3.5 h-3.5 text-brand-500" />
              Powered by Telivio AI Recruiting
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <div className="border-b border-surface-800 bg-surface-900">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          {branding.enabled ? (
            <span className="font-bold text-white text-lg">{branding.displayName}</span>
          ) : (
            <>
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">Telivio</span>
            </>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Job header */}
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-brand-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {job.department && (
                  <span className="flex items-center gap-1 text-sm text-surface-400">
                    <Briefcase className="w-3.5 h-3.5" /> {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1 text-sm text-surface-400">
                    <MapPin className="w-3.5 h-3.5" /> {job.location}
                  </span>
                )}
                {job.employment_type && (
                  <span className="flex items-center gap-1 text-sm text-surface-400">
                    <Clock className="w-3.5 h-3.5" /> {job.employment_type}
                  </span>
                )}
                {job.salary_range && (
                  <span className="badge bg-emerald-500/10 text-emerald-400">{job.salary_range}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">About this role</h3>
              <p className="text-sm text-surface-400 leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Requirements</h3>
              <p className="text-sm text-surface-400 leading-relaxed whitespace-pre-line">{job.requirements}</p>
            </div>
          </div>
        </div>

        {/* Application form */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Apply for this role</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resume upload — first, since the AI needs it most */}
            <div>
              <label className="label">Resume / CV *</label>
              <p className="text-xs text-surface-500 mb-2">
                Upload your resume as a PDF, DOCX, or TXT file (max 10MB). Our AI agent reads it automatically.
              </p>

              {!resumeFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    dragActive
                      ? 'border-brand-500 bg-brand-500/5'
                      : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/30'
                  }`}
                >
                  <Upload className="w-7 h-7 text-surface-500 mx-auto mb-3" />
                  <p className="text-sm text-surface-300 font-medium">
                    Drop your resume here, or click to browse
                  </p>
                  <p className="text-xs text-surface-600 mt-1">PDF, DOCX, or TXT — up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="border border-surface-700 rounded-xl p-4 flex items-center gap-3 bg-surface-800/30">
                  <div className="w-10 h-10 bg-brand-600/15 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{resumeFile.name}</p>
                    <p className="text-xs text-surface-500">
                      {uploadingResume
                        ? 'Uploading…'
                        : resumeData
                          ? `${(resumeFile.size / 1024).toFixed(0)} KB · Ready`
                          : 'Failed to upload'}
                    </p>
                  </div>
                  {uploadingResume ? (
                    <Loader2 className="w-4 h-4 animate-spin text-surface-500 flex-shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={removeResume}
                      className="text-surface-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input name="name" className="input" placeholder="Jane Smith" value={form.name} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input name="email" type="email" className="input" placeholder="jane@example.com" value={form.email} onChange={handleChange} required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input name="phone" type="tel" className="input" placeholder="+1 (555) 000-0000" value={form.phone} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Current Location</label>
                <input name="location" className="input" placeholder="e.g. Austin, TX" value={form.location} onChange={handleChange} />
              </div>
            </div>

            {/* Hiring-specific fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Salary Expectation
                </label>
                <input
                  name="salary_expectation"
                  className="input"
                  placeholder="e.g. $90,000 – $110,000"
                  value={form.salary_expectation}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label">Years of Experience</label>
                <select name="years_experience" className="input" value={form.years_experience} onChange={handleChange}>
                  <option value="">Select…</option>
                  <option value="0-1">0–1 years</option>
                  <option value="1-3">1–3 years</option>
                  <option value="3-5">3–5 years</option>
                  <option value="5-10">5–10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Earliest Start Date
                </label>
                <input
                  name="earliest_start_date"
                  type="date"
                  className="input"
                  value={form.earliest_start_date}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5" /> Work Authorization
                </label>
                <select name="work_authorization" className="input" value={form.work_authorization} onChange={handleChange}>
                  <option value="">Select…</option>
                  <option value="citizen">Citizen</option>
                  <option value="permanent_resident">Permanent Resident</option>
                  <option value="visa_sponsorship_required">Requires Visa Sponsorship</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">LinkedIn URL</label>
                <input name="linkedin_url" type="url" className="input" placeholder="https://linkedin.com/in/..." value={form.linkedin_url} onChange={handleChange} />
              </div>
              <div>
                <label className="label">Portfolio / Website</label>
                <input name="portfolio_url" type="url" className="input" placeholder="https://yoursite.com" value={form.portfolio_url} onChange={handleChange} />
              </div>
            </div>

            {/* Cover note */}
            <div>
              <label className="label">Note to the Hiring Team (optional)</label>
              <textarea
                name="cover_note"
                className="input resize-none"
                rows={4}
                placeholder="Anything you'd like to add — why you're interested, relevant context, etc."
                value={form.cover_note}
                onChange={handleChange}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || uploadingResume}
                className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
                style={branding.enabled && branding.accentColor ? { backgroundColor: branding.accentColor, borderColor: branding.accentColor } : undefined}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting application...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
              <p className="text-center text-xs text-surface-600 mt-3">
                By submitting, you agree that your information will be processed by our AI recruiting system.
              </p>
            </div>
          </form>
        </div>

        {!branding.enabled && (
          <div className="flex items-center justify-center gap-2 text-xs text-surface-700">
            <Zap className="w-3.5 h-3.5 text-brand-600" />
            Powered by Telivio Autonomous AI Recruiting
          </div>
        )}
      </div>
    </div>
  )
}
