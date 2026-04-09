const siteBasePath = process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? '';
const apiBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api';

function normalizeApiPath(pathname: string) {
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    if (apiBasePath === '/api') {
      return pathname;
    }

    return `${apiBasePath}${pathname.slice('/api'.length)}`;
  }

  if (pathname === apiBasePath || pathname.startsWith(`${apiBasePath}/`)) {
    return pathname;
  }

  return `${apiBasePath}${pathname}`;
}

export function getClientApiPath(pathname: string) {
  if (!pathname.startsWith('/')) {
    throw new Error(`API path must start with /, received: ${pathname}`);
  }

  return `${siteBasePath}${normalizeApiPath(pathname)}`;
}

export function getClientAssetPath(pathname: string | null | undefined) {
  if (!pathname) {
    return '';
  }

  if (/^(https?:|data:|blob:)/.test(pathname)) {
    return pathname;
  }

  if (!pathname.startsWith('/')) {
    return pathname;
  }

  return `${siteBasePath}${pathname}`;
}