/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Avatares do Google (Supabase Auth) e logos externas das casas de aposta.
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

export default nextConfig;
