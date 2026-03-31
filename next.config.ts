import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
// Derive wss:// and https:// origins for CSP
const supabaseHost = supabaseUrl.replace(/^https?:\/\//, '')

const ContentSecurityPolicy = [
  "default-src 'self'",
  // Supabase REST + Auth + Realtime (https and wss)
  `connect-src 'self' ${supabaseUrl} https://${supabaseHost} wss://${supabaseHost}`,
  // Next.js requires unsafe-inline for hydration scripts in App Router
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind uses inline styles
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Block Flash, Java, etc.
  "object-src 'none'",
  // Prevent base-tag hijacking
  "base-uri 'self'",
  // Only allow form submissions to same origin
  "form-action 'self'",
  // Prevent embedding in iframes (clickjacking)
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  // Disable DNS prefetching to reduce information leakage
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Force HTTPS for 2 years, include subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer information sent to external sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features not used by this app
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
