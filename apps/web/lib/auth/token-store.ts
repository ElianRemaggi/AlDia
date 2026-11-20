// Access token lives only in memory (never localStorage) to limit XSS exposure.
// It is restored on page load from the httpOnly refresh cookie.
let token: string | null = null;

export const tokenStore = {
  get: () => token,
  set: (t: string) => {
    token = t;
  },
  clear: () => {
    token = null;
  },
};
