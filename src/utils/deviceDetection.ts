export type MobilePlatform = 'android' | 'ios' | 'desktop';

export interface MobileWebDetection {
  isMobileWeb: boolean;
  platform: MobilePlatform;
  isStandalone: boolean;
}

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) {
      return true;
    }
    if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')) {
      return true;
    }
  } catch {
    // Ignore media query errors
  }
  return false;
}

export function detectMobileWeb(): MobileWebDetection {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isMobileWeb: false, platform: 'desktop', isStandalone: false };
  }

  const standalone = isStandaloneApp();
  const ua = navigator.userAgent || '';
  const navWithUAData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean; platform?: string };
  };

  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isOtherMobile = /webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const hasMobileUAData = navWithUAData.userAgentData?.mobile === true;
  const isNarrowTouchViewport =
    ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 900;

  const isMobileDevice = isAndroid || isIOS || isOtherMobile || hasMobileUAData || isNarrowTouchViewport;

  const platform: MobilePlatform = isAndroid
    ? 'android'
    : isIOS
      ? 'ios'
      : isMobileDevice
        ? 'android'
        : 'desktop';

  return {
    isMobileWeb: isMobileDevice && !standalone,
    platform,
    isStandalone: standalone,
  };
}

export function isCustomAppScheme(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return !/^https?:\/\//i.test(trimmed) && /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
}
