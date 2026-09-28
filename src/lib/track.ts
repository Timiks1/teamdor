// Події GA4. gtag з'являється лише після згоди на cookies, до того виклики просто ігноруються.
declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

export function track(event: string, params: Record<string, string> = {}) {
  window.gtag?.('event', event, params);
}
