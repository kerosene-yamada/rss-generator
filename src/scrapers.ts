import * as cheerio from 'cheerio';
import { FeedItem, SiteConfig, LoginSiteConfig } from './types';

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

function createMhlwShingiScraper(prefix: string) {
  return (html: string, baseUrl: string): FeedItem[] => {
    const $ = cheerio.load(html);
    const items: FeedItem[] = [];

    $('table tr').each((_, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 3) return;

      const kaisuText = tds.eq(0).text().trim();
      const dateText = tds.eq(1).text().trim();
      const agendaText = tds.eq(2).text().trim();

      const dateMatch = dateText.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
      if (!dateMatch) return;

      const date = dateMatch[1];
      const kaisu = kaisuText !== '－' ? kaisuText : '';
      const title = kaisu
        ? `${prefix} ${kaisu}（${date}）`
        : `${prefix}（${date}）`;
      const description = agendaText !== '－' ? agendaText : '';
      const guid = `${baseUrl}#${kaisu || 'special'}-${date}`;

      items.push({
        title,
        link: baseUrl,
        guid,
        date,
        description: description.slice(0, 300),
      });
    });

    return items.slice(0, 20);
  };
}

export const mhlwAhakiSite: SiteConfig = {
  name: '社会保障審議会 あはき療養費検討専門委員会',
  url: 'https://www.mhlw.go.jp/stf/shingi/shingi-hosho_126708.html',
  scraper: createMhlwShingiScraper('あはき療養費検討専門委員会'),
};

export const mhlwShougaifukushiSite: SiteConfig = {
  name: '障害福祉サービス等報酬改定検討チーム',
  url: 'https://www.mhlw.go.jp/stf/shingi/other-syougai_446935_00001.html',
  scraper: createMhlwShingiScraper('障害福祉サービス等報酬改定検討チーム'),
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
