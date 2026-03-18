import * as cheerio from 'cheerio';
import { FeedItem, SiteConfig } from './types';

export const sites: SiteConfig[] = [
  {
    name: 'Gemini API リリースノート',
    url: 'https://ai.google.dev/gemini-api/docs/changelog?hl=ja',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      // h2要素（日付見出し）とその直後のリストを取得
      $('h2').each((_, el) => {
        const title = $(el).text().trim();
        if (!title.match(/\d{4}/)) return; // 年が含まれる見出しのみ

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
