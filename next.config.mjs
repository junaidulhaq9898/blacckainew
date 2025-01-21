/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com', // Match all subdomains of cdninstagram.com
      },
    ],
  },
  output: 'standalone', // For optimal Vercel deployments
};

export default nextConfig;
