export type UserRole = 'hr' | 'admin'
export type JobStatus = 'active' | 'paused' | 'closed'
export type CandidateStatus = 'applied' | 'screened' | 'interview' | 'offer' | 'rejected'
export type InterviewStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
export type EmailType = 'interview_invite' | 'rejection' | 'offer' | 'followup'

export interface User {
  id: string
  email: string
  full_name?: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Job {
  id: string
  title: string
  description: string
  requirements: string
  department?: string
  location?: string
  employment_type?: string
  salary_range?: string
  status: JobStatus
  created_by?: string
  created_at: string
  updated_at: string
  _count?: {
    candidates: number
  }
}

export interface Candidate {
  id: string
  organization_id: string
  job_id: string
  name: string
  email: string
  phone?: string
  location?: string
  salary_expectation?: string
  years_experience?: string
  earliest_start_date?: string
  work_authorization?: string
  cover_note?: string
  resume_url?: string
  resume_filename?: string
  resume_text?: string
  score?: number
  reasoning?: string
  strengths?: string[]
  weaknesses?: string[]
  status: CandidateStatus
  linkedin_url?: string
  portfolio_url?: string
  created_at: string
  updated_at: string
  job?: Job
  interviews?: Interview[]
  notes?: Note[]
}

export interface Interview {
  id: string
  candidate_id: string
  job_id: string
  cal_event_id?: string
  cal_booking_uid?: string
  scheduling_link?: string
  scheduled_time?: string
  status: InterviewStatus
  interview_type?: string
  meeting_url?: string
  created_at: string
  updated_at: string
  candidate?: Candidate
}

export interface Note {
  id: string
  candidate_id: string
  created_by?: string
  note: string
  created_at: string
  user?: User
}

export interface EmailLog {
  id: string
  candidate_id?: string
  email_type: EmailType
  to_email: string
  subject: string
  resend_id?: string
  status: string
  sent_at: string
}

export interface AIScoreResult {
  score: number
  reasoning: string
  strengths: string[]
  weaknesses: string[]
}

export interface DashboardStats {
  totalJobs: number
  activeJobs: number
  totalCandidates: number
  screened: number
  interviews: number
  offers: number
  rejected: number
  avgScore: number
}

export interface PipelineColumn {
  id: CandidateStatus
  label: string
  candidates: Candidate[]
  color: string
}
