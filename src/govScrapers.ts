import * as cheerio from 'cheerio';
import { FeedItem, SiteConfig } from './types';

export const govSites: SiteConfig[] = [
  {
    name: 'こども家庭庁 障害児支援施策',
    url: 'https://www.cfa.go.jp/policies/shougaijishien/shisaku/',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      // リンク一覧から報酬改定・通知・Q&A関連を抽出
      const keywords = ['報酬', '改定', '通知', '告示', '検討会', '部会', 'Q&A', 'QA', '留意事項', '施策'];

      $('a').each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr('href') || '';
        if (!title || !href) return;

        const matched = keywords.some((kw) => title.includes(kw));
        if (!matched) return;

        const fullUrl = href.startsWith('http')
          ? href
          : href.startsWith('/')
          ? `https://www.cfa.go.jp${href}`
          : `${baseUrl}${href}`;

        items.push({
          title: `こども家庭庁（障害児支援施策）: ${title}`,
          link: fullUrl,
          date: new Date().toUTCString(),
        });
      });

      // 重複リンクを除去
      const seen = new Set<string>();
      return items.filter((item) => {
        if (seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      }).slice(0, 20);
    },
  },

  {
    name: 'こども家庭庁 障害児支援部会（審議会）',
    url: 'https://www.cfa.go.jp/councils/shingikai/shougaiji_shien/',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      // 各回の審議会・部会リンクを取得
      $('a').each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr('href') || '';
        if (!title || !href) return;

        // 「第〇回」「令和」「資料」などを含む行が審議会の案内
        const matched =
          /第\d+回|令和\d+年|資料|議事録|開催|報告書/.test(title);
        if (!matched) return;

        const fullUrl = href.startsWith('http')
          ? href
          : href.startsWith('/')
          ? `https://www.cfa.go.jp${href}`
          : `${baseUrl}${href}`;

        items.push({
          title: `こども家庭庁（障害児支援部会）: ${title}`,
          link: fullUrl,
          date: new Date().toUTCString(),
        });
      });

      const seen = new Set<string>();
      return items.filter((item) => {
        if (seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      }).slice(0, 20);
    },
  },

  {
    name: '厚生労働省 あはき療養費検討専門委員会',
    url: 'https://www.mhlw.go.jp/stf/shingi/shingi-hosho_126708.html',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      // テーブル行から各回の委員会情報を取得
      $('table tr').each((_, el) => {
        const cells = $(el).find('td');
        if (cells.length < 2) return;

        const dateText = $(cells[0]).text().trim();
        const link = $(cells[1]).find('a').first();
        const title = link.text().trim() || $(cells[1]).text().trim();
        const href = link.attr('href') || '';

        if (!title || !dateText) return;

        const fullUrl = href.startsWith('http')
          ? href
          : href.startsWith('/')
          ? `https://www.mhlw.go.jp${href}`
          : '';

        items.push({
          title: `厚労省（あはき療養費委員会）: ${title}`,
          link: fullUrl || baseUrl,
          date: dateText,
          description: `開催日: ${dateText}`,
        });
      });

      // テーブル構造でなければリンク一覧から取得
      if (items.length === 0) {
        $('a').each((_, el) => {
          const title = $(el).text().trim();
          const href = $(el).attr('href') || '';
          if (!title || !href) return;
          if (!/第\d+回|令和\d+年|配付資料|議事録/.test(title)) return;

          const fullUrl = href.startsWith('http')
            ? href
            : `https://www.mhlw.go.jp${href}`;

          items.push({
            title: `厚労省（あはき療養費委員会）: ${title}`,
            link: fullUrl,
            date: new Date().toUTCString(),
          });
        });
      }

      const seen = new Set<string>();
      return items.filter((item) => {
        if (seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      }).slice(0, 20);
    },
  },
];
