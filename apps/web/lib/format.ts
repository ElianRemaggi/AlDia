const date = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const dateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** "2026-03-01" (a calendar date, no timezone) → "1 mar 2026". */
export const formatCalendarDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return date.format(new Date(y, m - 1, d));
};

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const compactMoney = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

/** API decimals arrive as strings ("1500.50"). */
export const formatMoney = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "—" : money.format(Number(value));

// useGrouping "always": Spanish locales skip the separator on 4-digit numbers ("3400"), unlike formatMoney.
const wholeMoney = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
  useGrouping: "always",
});

/** Axis ticks: whole pesos under 10.000, compact above (ticks are round numbers). */
export const formatMoneyTick = (value: number) =>
  Math.abs(value) >= 10_000 ? compactMoney.format(value) : wholeMoney.format(value);

export const formatPercent = (value: string | number) => `${percent.format(Number(value))}%`;
