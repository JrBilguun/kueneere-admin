/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    // Хуучин Vault хуудас → Бараа
    return [{ source: '/assets', destination: '/products', permanent: false }]
  },
}

export default nextConfig
