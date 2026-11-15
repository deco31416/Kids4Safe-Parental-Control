const mobileAppUrl = (
  process.env.NEXT_PUBLIC_MOBILE_APP_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8081' : '')
).replace(/\/+$/, '');

export const appLinks = {
  login: `${mobileAppUrl}/login`,
  register: `${mobileAppUrl}/register`,
};
