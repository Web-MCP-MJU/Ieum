import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'Permissions-Policy', value: 'tools=(self)' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
];

const nextConfig: NextConfig = {
  async headers() {
    // Vinext beta does not currently include `/` in its `/:path*` matcher.
    return [
      { source: '/', headers: securityHeaders },
      { source: '/:path*', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
