export function isDesktopDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipod|blackberry|iemobile/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(ua);

  return !isMobile && !isTablet;
}
