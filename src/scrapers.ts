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

  {
    name: 'kintone アップデート情報',
    url: 'https://jp.kintone.help/k/ja/update/all',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      // dt/dd形式のリスト（日付: タイトル）
      $('dt').each((_, el) => {
        const date = $(el).text().trim();
        const dd = $(el).next('dd');
        dd.find('a').each((_, link) => {
          const title = $(link).text().trim();
          const href = $(link).attr('href') || '';
          const fullUrl = href.startsWith('http') ? href : `https://jp.kintone.help${href}`;
          if (title) {
            items.push({ title: `kintone: ${title}`, link: fullUrl, date });
          }
        });
      });

      return items.slice(0, 20);
    },
  },

  {
    name: 'XServer Drive お知らせ',
    url: 'https://drive.xserver.ne.jp/support/news/',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      // dl > dt/dd 構造（EUC-JPサイトだが axios が UTF-8 変換）
      $('dt').each((_, el) => {
        const date = $(el).text().trim();
        const dd = $(el).next('dd');
        dd.find('a').each((_, link) => {
          const title = $(link).text().trim();
          const href = $(link).attr('href') || '';
          const fullUrl = href.startsWith('http') ? href : `https://drive.xserver.ne.jp${href}`;
          if (title) {
            items.push({ title: `XServer Drive: ${title}`, link: fullUrl, date });
          }
        });
      });

      return items.slice(0, 20);
    },
  },

  {
    name: 'Microsoft 365 Apps 更新履歴',
    url: 'https://learn.microsoft.com/ja-jp/officeupdates/update-history-microsoft365-apps-by-date',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      // テーブル行を取得
      $('table tbody tr').each((_, el) => {
        const cells = $(el).find('td');
        if (cells.length < 2) return;
        const date = $(cells[0]).text().trim();
        const title = $(cells[1]).text().trim();
        const link = $(cells[1]).find('a').attr('href') || baseUrl;
        const fullUrl = link.startsWith('http') ? link : `https://learn.microsoft.com${link}`;
        if (date && title) {
          items.push({ title: `M365: ${title}`, link: fullUrl, date });
        }
      });

      return items.slice(0, 20);
    },
  },

  {
    name: 'Microsoft 365 セキュリティ更新プログラム',
    url: 'https://learn.microsoft.com/ja-jp/officeupdates/microsoft365-apps-security-updates',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      $('table tbody tr').each((_, el) => {
        const cells = $(el).find('td');
        if (cells.length < 2) return;
        const date = $(cells[0]).text().trim();
        const title = $(cells[1]).text().trim();
        const link = $(cells[1]).find('a').attr('href') || baseUrl;
        const fullUrl = link.startsWith('http') ? link : `https://learn.microsoft.com${link}`;
        if (date && title) {
          items.push({ title: `M365 Security: ${title}`, link: fullUrl, date });
        }
      });

      return items.slice(0, 20);
    },
  },

  {
    name: 'cybozu.dev kintone API アップデート',
    url: 'https://cybozu.dev/ja/kintone/news/api-updates/',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      // 記事カード or リスト形式
      $('article, .article, li').each((_, el) => {
        const link = $(el).find('a').first();
        const title = link.text().trim() || $(el).find('h2, h3').text().trim();
        const href = link.attr('href') || '';
        const date = $(el).find('time, .date').text().trim();
        const fullUrl = href.startsWith('http') ? href : `https://cybozu.dev${href}`;

        if (title && href) {
          items.push({ title: `cybozu.dev: ${title}`, link: fullUrl, date });
        }
      });

      return items.slice(0, 20);
    },
  },
];
