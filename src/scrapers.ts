import * as cheerio from 'cheerio';
import {FeedItem, SiteConfig, LoginSiteConfig} from './types';

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

export const hugCopainSite: LoginSiteConfig = {
  name: 'HUG リリースノート',
  loginUrl: 'https://www.hug-copain-sakura-be.link/hug/wm/',
  url: 'https://www.hug-copain-sakura-be.link/hug/wm/release_note.php',
  scraper: (html, baseUrl) => {
    const $ = cheerio.load(html);
    const items: FeedItem[] = [];

    $('table.table_release_note tr').each((_, tr) => {
      const meta = $(tr).find('ul.releaseMeta');
      if (!meta.length) return;

      const lis = meta.find('li');
      const date = lis.eq(0).text().trim();
      const version = lis.eq(1).text().trim();

      // ul.releaseMeta を除いた td のテキストを説明文として取得
      const td = $(tr).find('td');
      meta.remove();
      const description = td.text().trim().replace(/\s+/g, ' ').slice(0, 300);

      if (date && version) {
        items.push({
          title: `${version} (${date})`,
          link: baseUrl,
          date,
          description,
        });
      }
    });

    return items.slice(0, 20);
  },
};
