import React from 'react';
import { Globe, MessageCircle, Send, Youtube } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import type { SocialLinksConfig } from '../types/math';

interface SocialFooterProps {
  previewLinks?: SocialLinksConfig;
  compact?: boolean;
  className?: string;
}

function sanitizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

const InstagramGlyph: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const XTwitterGlyph: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const SocialFooter: React.FC<SocialFooterProps> = ({
  previewLinks,
  compact = false,
  className = '',
}) => {
  const { socialLinks, settings } = usePlatform();
  const lang = settings.language;
  const active = previewLinks ?? socialLinks;

  const items = [
    {
      key: 'instagram',
      label: 'Instagram',
      url: sanitizeHttpUrl(active.instagramUrl),
      icon: InstagramGlyph,
      accent: 'text-pink-600 dark:text-pink-400',
    },
    {
      key: 'telegram',
      label: 'Telegram',
      url: sanitizeHttpUrl(active.telegramUrl),
      icon: Send,
      accent: 'text-sky-600 dark:text-sky-400',
    },
    {
      key: 'twitter',
      label: 'Twitter / X',
      url: sanitizeHttpUrl(active.twitterUrl),
      icon: XTwitterGlyph,
      accent: 'text-slate-800 dark:text-slate-200',
    },
    {
      key: 'youtube',
      label: 'YouTube',
      url: sanitizeHttpUrl(active.youtubeUrl),
      icon: Youtube,
      accent: 'text-rose-600 dark:text-rose-400',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      url: sanitizeHttpUrl(active.whatsappUrl),
      icon: MessageCircle,
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'website',
      label: lang === 'hi' ? 'वेबसाइट' : 'Website',
      url: sanitizeHttpUrl(active.websiteUrl),
      icon: Globe,
      accent: 'text-indigo-600 dark:text-indigo-400',
    },
  ].filter((item): item is Omit<typeof item, 'url'> & { url: string } => Boolean(item.url));

  if (items.length === 0) {
    if (!previewLinks) return null;
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
        No social media URLs configured yet. Add any Instagram, Telegram, Twitter / X, YouTube, WhatsApp, or Website link above to show SocialFooter in Profile and Settings.
      </div>
    );
  }

  if (compact) {
    return (
      <footer className={`pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {lang === 'hi' ? 'समुदाय व सोशल मीडिया से जुड़ें' : 'Connect with SankhyaPrep'}
          </span>
          <span>Powered by Exam Lens</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.key}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-900/70 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${item.accent}`} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="space-y-0.5">
        <div className="text-sm font-bold text-slate-900 dark:text-white">
          {lang === 'hi' ? 'आधिकारिक समुदाय और सोशल चैनल्स' : 'Official Community & Social Channels'}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {lang === 'hi'
            ? 'दैनिक गणित शॉर्टकट, टेस्ट अपडेट और अध्ययन सामग्री के लिए जुड़ें।'
            : 'Follow SankhyaPrep by Exam Lens for daily math shortcuts, mock alerts & study updates.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.key}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Icon className={`w-4 h-4 shrink-0 ${item.accent}`} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </footer>
  );
};
