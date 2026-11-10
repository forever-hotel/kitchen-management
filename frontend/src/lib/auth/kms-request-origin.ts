/** Use the configured browser origin when Next.js runs behind Docker or a proxy. */
export function kmsRequestOrigin(request: Request): string | null {
  const configured = process.env.APP_ORIGIN;
  if (!configured) return new URL(request.url).origin;

  try {
    const url = new URL(configured);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
