import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Confirmed against the Next.js 16.2.9 docs: serverActions.allowedOrigins
  // still lives under `experimental`, even though Server Actions
  // themselves have been stable since v14. Don't move this out.
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default nextConfig
