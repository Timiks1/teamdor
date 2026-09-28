// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// Домен ще не куплено — задайте SITE_URL у .env перед деплоєм.
const site = process.env.SITE_URL || 'https://teamdor.studio';

export default defineConfig({
  site,
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'uk',
    locales: ['uk', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'uk', locales: { uk: 'uk-UA', en: 'en' } },
      filter: (page) => !/\/(thanks|404)\/?$/.test(page) && !page.includes('/admin'),
    }),
  ],
  build: { inlineStylesheets: 'always' },
});
