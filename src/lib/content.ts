// Увесь контент сайту живе в /content і редагується через адмінку (/admin).
import contacts from '../../content/contacts.json';

import ukHome from '../../content/uk/home.json';
import ukServices from '../../content/uk/services.json';
import ukPricing from '../../content/uk/pricing.json';
import ukCases from '../../content/uk/cases.json';
import ukFaq from '../../content/uk/faq.json';
import ukUi from '../../content/uk/ui.json';

import enHome from '../../content/en/home.json';
import enServices from '../../content/en/services.json';
import enPricing from '../../content/en/pricing.json';
import enCases from '../../content/en/cases.json';
import enFaq from '../../content/en/faq.json';
import enUi from '../../content/en/ui.json';

export type Lang = 'uk' | 'en';
export const LANGS: Lang[] = ['uk', 'en'];

const dict = {
  uk: { home: ukHome, services: ukServices, pricing: ukPricing, cases: ukCases, faq: ukFaq, ui: ukUi },
  en: { home: enHome, services: enServices, pricing: enPricing, cases: enCases, faq: enFaq, ui: enUi },
};

export type Content = (typeof dict)['uk'];

export function getContent(lang: Lang): Content {
  return dict[lang] as Content;
}

export { contacts };

/** Шлях сторінки з урахуванням мови: '/', '/privacy' → '/en/', '/en/privacy' */
export function localePath(lang: Lang, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'uk') return clean;
  return clean === '/' ? '/en/' : `/en${clean}`;
}

/** Та сама сторінка іншою мовою */
export function switchPath(pathname: string, to: Lang): string {
  const base = pathname.replace(/^\/en(\/|$)/, '/');
  return localePath(to, base);
}

export const htmlLang: Record<Lang, string> = { uk: 'uk', en: 'en' };
export const ogLocale: Record<Lang, string> = { uk: 'uk_UA', en: 'en_US' };

export const LEGAL_SLUGS = ['privacy', 'offer', 'cookies'] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
