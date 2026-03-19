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
          guid: `${baseUrl}#${title.replace(/\s+/g, '-')}`,
          date: title,
          description,
        });
      });

      return items.slice(0, 20);
    },
  },
];

export const mhlwShougaijiSite: SiteConfig = {
  name: '障害福祉サービス等報酬改定検討チーム',
  url: 'https://www.mhlw.go.jp/stf/shingi/other-syougai_446935_00001.html',
  scraper: (html, baseUrl) => {
    const $ = cheerio.load(html);
    const items: FeedItem[] = [];
    const mhlwBase = 'https://www.mhlw.go.jp';

    $('table tr').each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length < 3) return;

      const session = cells.eq(0).text().trim();
      const rawDate = cells.eq(1).text().trim();
      const agenda = cells
        .eq(2)
        .text()
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 300);

      // "2026年3月10日 （令和8年3月10日）" から西暦部分だけ抽出
      const dateMatch = rawDate.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
      if (!dateMatch) return;
      const date = dateMatch[1];

      // 議事録・資料・開催案内の順で最初のリンクを使用
      let link = baseUrl;
      for (let i = 3; i <= 5; i++) {
        const href = cells.eq(i).find('a').attr('href');
        if (href && href !== '#') {
          link = href.startsWith('http') ? href : `${mhlwBase}${href}`;
          break;
        }
      }

      const label =
        session && session !== '－' ? `${session}（${date}）` : date;

      items.push({
        title: `障害福祉サービス等報酬改定検討チーム ${label}`,
        link,
        guid: `mhlw-shougaiji-${session !== '－' ? session : 'extra'}-${date}`,
        date,
        description: agenda,
      });
    });

    return items.slice(0, 20);
  },
};

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
        // バージョン+日付でユニークなguidを生成
        const guid = `${baseUrl}#${version}-${date.replace(/[年月日\s]/g, '-')}`;
        items.push({
          title: `${version} (${date})`,
          link: baseUrl,
          guid,
          date,
          description,
        });
      }
    });

    return items.slice(0, 20);
  },
};
