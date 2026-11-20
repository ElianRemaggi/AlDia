const date = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const dateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (iso: string) => date.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** "2026-03-01" (a calendar date, no timezone) → "1 mar 2026". */
export const formatCalendarDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return date.format(new Date(y, m - 1, d));
};
