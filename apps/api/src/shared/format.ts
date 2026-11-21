// User-facing text built by the API (notifications, WhatsApp export) uses Argentine formatting.

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const pct = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });

/**
 * 1500.5 / "1500.50" → "$ 1.500,50". Intl separates "$" with a no-break space (U+00A0)
 * on purpose: it keeps the amount from wrapping across lines in the UI and in WhatsApp.
 */
export const formatArs = (value: number | string): string => ars.format(Number(value));

/** 20 → "+20%", -5.25 → "-5,3%" */
export const formatPct = (value: number | string): string => `${pct.format(Number(value))}%`;
