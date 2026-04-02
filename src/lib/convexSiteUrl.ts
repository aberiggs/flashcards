export function getConvexSiteUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
  }

  const url = new URL(convexUrl);

  if (url.hostname.endsWith('.convex.site')) {
    return `${url.protocol}//${url.hostname}`;
  }

  if (url.hostname.endsWith('.convex.cloud')) {
    const siteHost = `${url.hostname.slice(0, -'.convex.cloud'.length)}.convex.site`;
    return `${url.protocol}//${siteHost}`;
  }

  throw new Error('Unable to derive Convex site URL from NEXT_PUBLIC_CONVEX_URL.');
}
