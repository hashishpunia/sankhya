import React, { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Smartphone, X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { getFallbackDownloadUrl } from '../services/adminService';
import type { AppPromoSettings } from '../types/math';
import { detectMobileWeb, type MobileWebDetection } from '../utils/deviceDetection';

interface AppPromotionBannerProps {
  previewConfig?: AppPromoSettings;
  forcePreview?: boolean;
  className?: string;
}

const DISMISS_STORAGE_KEY = 'sankhyaprep_app_promo_dismissed';

export const AppPromotionBanner: React.FC<AppPromotionBannerProps> = ({
  previewConfig,
  forcePreview = false,
  className = '',
}) => {
  const { appPromo, officialDownloadUrl, settings } = usePlatform();
  const lang = settings.language;
  const config = previewConfig ?? appPromo;

  const [detection, setDetection] = useState<MobileWebDetection>(() => detectMobileWeb());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (forcePreview) return false;
    try {
      return sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [attemptingOpen, setAttemptingOpen] = useState(false);
  const [showDownloadFallback, setShowDownloadFallback] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const refreshDetection = () => setDetection(detectMobileWeb());
    refreshDetection();
    window.addEventListener('resize', refreshDetection);
    return () => {
      window.removeEventListener('resize', refreshDetection);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Reset fallback prompt whenever admin changes config
  useEffect(() => {
    setShowDownloadFallback(false);
    setAttemptingOpen(false);
  }, [config.appDeepLinkUrl, config.officialDownloadUrl, config.enabled]);

  if (!forcePreview) {
    if (!config.enabled) return null;
    if (dismissed) return null;
    if (detection.isStandalone) return null;
    if (config.mobileOnly && !detection.isMobileWeb) return null;
  }

  const resolvedDownloadUrl =
    config.officialDownloadUrl.trim() || officialDownloadUrl || getFallbackDownloadUrl();
  const resolvedDeepLink = config.appDeepLinkUrl.trim();
  const hasSeparateDeepLink = Boolean(resolvedDeepLink) && resolvedDeepLink !== resolvedDownloadUrl;

  const displayTitle =
    previewConfig || config.title !== 'Get the SankhyaPrep App'
      ? config.title
      : lang === 'hi'
        ? 'SankhyaPrep मोबाइल ऐप पाएं'
        : config.title;

  const displaySubtitle =
    previewConfig || config.subtitle !== 'Faster offline speed-math drills & instant live test alerts'
      ? config.subtitle
      : lang === 'hi'
        ? 'तेज़ ऑफ़लाइन अभ्यास और लाइव टेस्ट अलर्ट सीधे ऐप में खोलें'
        : config.subtitle;

  const displayCtaLabel =
    previewConfig || config.ctaLabel !== 'Open in App'
      ? config.ctaLabel
      : lang === 'hi'
        ? 'ऐप में खोलें'
        : config.ctaLabel;

  const platformNote =
    detection.platform === 'android'
      ? 'Android Mobile Web'
      : detection.platform === 'ios'
        ? 'iOS Mobile Web'
        : lang === 'hi'
          ? 'आधिकारिक ऐप'
          : 'Mobile App';

  const handleDismiss = () => {
    if (forcePreview) return;
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // Ignore storage restrictions
    }
  };

  const handleDeepLinkClick = () => {
    if (!resolvedDeepLink) return;
    if (forcePreview) {
      setShowDownloadFallback(true);
      return;
    }

    setAttemptingOpen(true);
    setShowDownloadFallback(false);

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    // Attempt native app / deep link launch
    window.location.assign(resolvedDeepLink);

    // If browser stays visible after 1.4s, app wasn't opened — reveal direct download prompt
    timerRef.current = window.setTimeout(() => {
      setAttemptingOpen(false);
      if (document.visibilityState === 'visible') {
        setShowDownloadFallback(true);
      }
    }, 1400);
  };

  return (
    <aside
      aria-label={displayTitle}
      className={`rounded-2xl bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm shadow-indigo-900/10 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-amber-300" />
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 text-[11px] font-medium text-indigo-100">
              <span>SankhyaPrep</span>
              <span aria-hidden="true">·</span>
              <span>{forcePreview && !detection.isMobileWeb ? 'Banner Preview' : platformNote}</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-white leading-snug">
              {displayTitle}
            </div>
            <p className="text-xs text-indigo-100/90 leading-snug line-clamp-2 sm:line-clamp-1">
              {displaySubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {hasSeparateDeepLink ? (
            <>
              <button
                type="button"
                onClick={handleDeepLinkClick}
                disabled={attemptingOpen}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-70"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  {attemptingOpen
                    ? lang === 'hi'
                      ? 'ऐप खुल रहा है...'
                      : 'Opening...'
                    : displayCtaLabel}
                </span>
              </button>

              <a
                href={resolvedDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'hi' ? 'डाउनलोड' : 'Download'}</span>
              </a>
            </>
          ) : (
            <a
              href={resolvedDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{displayCtaLabel}</span>
            </a>
          )}

          {!forcePreview && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={lang === 'hi' ? 'बैनर बंद करें' : 'Dismiss app banner'}
              className="w-10 h-10 rounded-xl hover:bg-white/15 text-indigo-100 hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Fallback prompt when deep link doesn't switch out of mobile web browser */}
      {showDownloadFallback && (
        <div className="mt-3 pt-2.5 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-indigo-50">
            {forcePreview
              ? 'Fallback preview: Shown if the native app is not installed on the mobile device.'
              : lang === 'hi'
                ? 'ऐप इंस्टॉल नहीं मिला? आधिकारिक ऐप डाउनलोड करें।'
                : "Didn't open the app? Install the official mobile app directly."}
          </span>
          <a
            href={resolvedDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'hi' ? 'आधिकारिक ऐप डाउनलोड करें' : 'Download Official App'}</span>
          </a>
        </div>
      )}
    </aside>
  );
};
