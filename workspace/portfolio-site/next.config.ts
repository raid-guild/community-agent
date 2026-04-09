import path from 'node:path';
import type { NextConfig } from 'next';

function normalizeBasePath(value: string | undefined, fallback = '') {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function normalizeOrigin(value: string | undefined) {
  if (!value) {
    return '';
  }

  return value.trim().replace(/\/+$/, '');
}

const siteBasePath = normalizeBasePath(process.env.SITE_BASE_PATH, '/site');
const apiBasePath = normalizeBasePath(process.env.API_BASE_PATH, '/api') || '/api';
const adminAppOrigin = normalizeOrigin(process.env.ADMIN_APP_ORIGIN)
  || 'http://127.0.0.1:4433';

const nextConfig: NextConfig = {
  basePath: siteBasePath || undefined,
  env: {
    NEXT_PUBLIC_API_BASE_PATH: apiBasePath,
    NEXT_PUBLIC_SITE_BASE_PATH: siteBasePath,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    return [
      {
        source: `${apiBasePath}/:path*`,
        destination: `${adminAppOrigin}${apiBasePath}/:path*`,
      },
    ];
  },
};

export default nextConfig;