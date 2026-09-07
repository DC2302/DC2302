/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ship the committed chart store, fitted weights and season scorecard with the API routes.
  outputFileTracingIncludes: {
    '/api/card': ['./data/**/*'],
    '/api/scorecard': ['./data/**/*'],
  },
};

export default nextConfig;
