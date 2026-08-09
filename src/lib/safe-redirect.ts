const internalOrigin = 'https://badger-sheild.invalid';

/** Returns an internal path only, preventing user-controlled external redirects. */
export function getSafeRedirectPath(value: unknown, fallback = '/'): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    /[\\]|%2f|%5c/i.test(value)
  ) {
    return fallback;
  }

  try {
    const destination = new URL(value, internalOrigin);

    if (destination.origin !== internalOrigin) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
