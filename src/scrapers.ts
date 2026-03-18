import * as cheerio from 'cheerio';
import { FeedItem, SiteConfig } from './types';

export const geminiSites: SiteConfig[] = [
  {
    name: 'Gemini API リリースノート',
    url: 'https://ai.google.dev/gemini-api/docs/changelog?hl=ja',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      $('h2').each((_, el) => {
        const title = $(el).text().trim();
        if (!title.match(/\d{4}/)) return;

        const description = $(el).nextUntil('h2').text().trim().slice(0, 200);
        items.push({
          title: `Gemini API: ${title}`,
          link: baseUrl,
          date: title,
          description,
        });
      });

      return items.slice(0, 20);
    },
  },
];

export const xserverSites: SiteConfig[] = [
  {
    name: 'XServer Drive 障害・メンテナンス情報',
    url: 'https://drive.xserver.ne.jp/support/information/',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      $('dt').each((_, el) => {
        const date = $(el).text().trim();
        const dd = $(el).next('dd');
        dd.find('a').each((_, link) => {
          const title = $(link).text().trim();
          const href = $(link).attr('href') || '';
          const fullUrl = href.startsWith('http') ? href : `https://drive.xserver.ne.jp${href}`;
          if (title) {
            items.push({ title: `XServer Drive 障害: ${title}`, link: fullUrl, date });
          }
        });
      });

      return items.slice(0, 20);
    },
  },
];
