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

// ── MHLW はり師・きゅう師及びあん摩・マッサージ・指圧師 療養費 ─────────────────
// ※ iryouhoken13/01.html はカテゴリ一覧ページのため、
//   はり師・きゅう師実質コンテンツの 01-02.html を直接参照する
export const mhlwAhakiSites: SiteConfig[] = [
  {
    name: '様式一覧（はり師・きゅう師及びあん摩・マッサージ・指圧師の施術に係る療養費）',
    url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/ryouyouhi_youshiki02.html',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];
      const mhlwBase = 'https://www.mhlw.go.jp';

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (!text || !href) return;
        // PDF / Word / Excel 文書リンクのみ
        if (!/\.(pdf|doc|docx|xls|xlsx)$/i.test(href)) return;

        const link = href.startsWith('http') ? href : `${mhlwBase}${href}`;

        // ファイル名から日付抽出: 8桁(YYYYMMDD) → 6桁(YYMMDD) の順で試みる
        let date = '';
        const m8 = href.match(/\/(\d{8})[-_]/);
        const m6 = href.match(/\/(\d{6})[-_]/);
        if (m8) {
          const r = m8[1];
          const yr = parseInt(r.slice(0, 4));
          const mo = parseInt(r.slice(4, 6));
          const dy = parseInt(r.slice(6, 8));
          if (yr >= 2000 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
            date = `${yr}年${mo}月${dy}日`;
        } else if (m6) {
          const r = m6[1];
          const yr = 2000 + parseInt(r.slice(0, 2));
          const mo = parseInt(r.slice(2, 4));
          const dy = parseInt(r.slice(4, 6));
          if (yr >= 2010 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31)
            date = `${yr}年${mo}月${dy}日`;
        }

        items.push({
          title: text.slice(0, 100),
          link,
          guid: link,
          date,
          description: '',
        });
      });

      const seen = new Set<string>();
      const unique = items.filter((item) => {
        if (seen.has(item.guid!)) return false;
        seen.add(item.guid!);
        return true;
      });
      unique.sort((a, b) => b.date.localeCompare(a.date));
      return unique.slice(0, 20);
    },
  },
  {
    name: 'はり師・きゅう師及びあん摩・マッサージ・指圧師の施術に係る療養費の改定等について',
    url: 'https://www.mhlw.go.jp/bunya/iryouhoken/iryouhoken13/01-02.html',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];
      const mhlwBase = 'https://www.mhlw.go.jp';

      $('li').each((_, el) => {
        const a = $(el).find('a').first();
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        const href = a.attr('href') ?? '';
        if (!text || text.length < 15) return;

        const link = href
          ? href.startsWith('http')
            ? href
            : `${mhlwBase}${href}`
          : baseUrl;

        const dateMatch = text.match(
          /[（(]((?:平成|令和)\d+年\d{1,2}月\d{1,2}日)/,
        );
        const date = dateMatch ? dateMatch[1] : '';

        items.push({
          title: text.slice(0, 150),
          link,
          guid:
            link !== baseUrl
              ? link
              : `${baseUrl}#${encodeURIComponent(text.slice(0, 40))}`,
          date,
          description: '',
        });
      });

      const seen = new Set<string>();
      return items
        .filter((item) => {
          if (seen.has(item.guid!)) return false;
          seen.add(item.guid!);
          return true;
        })
        .slice(0, 20);
    },
  },
  {
    name: 'はり師・きゅう師及びあん摩・マッサージ・指圧師の施術に係る療養費の取扱い（Ｑ＆Ａ）について',
    url: 'https://www.mhlw.go.jp/bunya/iryouhoken/iryouhoken13/03.html',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];
      const mhlwBase = 'https://www.mhlw.go.jp';

      $('li').each((_, el) => {
        const a = $(el).find('a').first();
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        const href = a.attr('href') ?? '';
        if (!text || text.length < 15) return;
        // はり師・きゅう師・あん摩関連のみ
        if (
          !text.includes('はり') &&
          !text.includes('きゅう') &&
          !text.includes('マッサージ') &&
          !text.includes('あん摩')
        )
          return;

        const link = href
          ? href.startsWith('http')
            ? href
            : `${mhlwBase}${href}`
          : baseUrl;

        const dateMatch = text.match(
          /[（(]((?:平成|令和)\d+年\d{1,2}月\d{1,2}日)/,
        );
        const date = dateMatch ? dateMatch[1] : '';

        items.push({
          title: text.slice(0, 150),
          link,
          guid:
            link !== baseUrl
              ? link
              : `${baseUrl}#${encodeURIComponent(text.slice(0, 40))}`,
          date,
          description: '',
        });
      });

      const seen = new Set<string>();
      return items
        .filter((item) => {
          if (seen.has(item.guid!)) return false;
          seen.add(item.guid!);
          return true;
        })
        .slice(0, 20);
    },
  },
];

// ── CFA 障害児支援関連 ───────────────────────────────────────────────────────
export const cfaShougaijiSites: SiteConfig[] = [
  {
    name: '障害児支援部会（審議会・検討会）',
    url: 'https://www.cfa.go.jp/councils/shingikai/shougaiji_shien/',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];
      const cfaBase = 'https://www.cfa.go.jp';

      $('ul li a').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const text = $(el).text().trim();
        if (!text || text.length < 5) return;
        if (!href.includes('/councils/') && !href.includes('/assets/')) return;

        const link = href.startsWith('http') ? href : `${cfaBase}${href}`;

        let date = '';
        const reiwa = text.match(/令和(\d+)年(\d{1,2})月(\d{1,2})日/);
        if (reiwa) {
          date = `${2018 + parseInt(reiwa[1])}年${reiwa[2]}月${reiwa[3]}日`;
        } else {
          const fd = href.match(/\/(\d{8})_/);
          if (fd) {
            const r = fd[1];
            date = `${r.slice(0, 4)}年${parseInt(r.slice(4, 6))}月${parseInt(r.slice(6, 8))}日`;
          }
        }

        items.push({ title: text, link, guid: link, date, description: '' });
      });

      const seen = new Set<string>();
      return items
        .filter((item) => {
          if (seen.has(item.guid!)) return false;
          seen.add(item.guid!);
          return true;
        })
        .slice(0, 20);
    },
  },
  {
    name: '障害児支援における人材育成に関する検討会',
    url: 'https://www.cfa.go.jp/councils/support-personnel/',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];
      const cfaBase = 'https://www.cfa.go.jp';

      $('ul li a').each((_, el) => {
        const href = $(el).attr('href') ?? '';
        const text = $(el).text().trim();
        if (!text || text.length < 3) return;
        if (!href.includes('/councils/') && !href.includes('/assets/')) return;

        const link = href.startsWith('http') ? href : `${cfaBase}${href}`;

        let date = '';
        const reiwa = text.match(/令和(\d+)年(\d{1,2})月(\d{1,2})日/);
        if (reiwa) {
          date = `${2018 + parseInt(reiwa[1])}年${reiwa[2]}月${reiwa[3]}日`;
        } else {
          const fd = href.match(/\/(\d{8})_/);
          if (fd) {
            const r = fd[1];
            date = `${r.slice(0, 4)}年${parseInt(r.slice(4, 6))}月${parseInt(r.slice(6, 8))}日`;
          }
        }

        items.push({ title: text, link, guid: link, date, description: '' });
      });

      const seen = new Set<string>();
      return items
        .filter((item) => {
          if (seen.has(item.guid!)) return false;
          seen.add(item.guid!);
          return true;
        })
        .slice(0, 20);
    },
  },
  {
    name: '障害児支援施策（こども家庭庁）',
    url: 'https://www.cfa.go.jp/policies/shougaijishien/shisaku/',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];
      const cfaBase = 'https://www.cfa.go.jp';

      $('li').each((_, el) => {
        const a = $(el).find('a[href*="/assets/"]').first();
        if (!a.length) return;

        const href = a.attr('href') ?? '';
        const text = $(el).text().trim().replace(/\s+/g, ' ');

        const fd = href.match(/\/(\d{8})_/);
        if (!fd) return;

        const r = fd[1];
        const yr = parseInt(r.slice(0, 4));
        const mo = parseInt(r.slice(4, 6));
        const dy = parseInt(r.slice(6, 8));
        if (yr < 2000 || mo < 1 || mo > 12 || dy < 1 || dy > 31) return;

        const date = `${yr}年${mo}月${dy}日`;
        const link = href.startsWith('http') ? href : `${cfaBase}${href}`;

        items.push({
          title: text.slice(0, 150),
          link,
          guid: link,
          date,
          description: '',
        });
      });

      const seen = new Set<string>();
      const unique = items.filter((item) => {
        if (seen.has(item.guid!)) return false;
        seen.add(item.guid!);
        return true;
      });
      unique.sort((a, b) => b.date.localeCompare(a.date));
      return unique.slice(0, 20);
    },
  },
];

// ── MHLW 社会保障審議会（障害者部会） ───────────────────────────────────────
export const mhlwShougaishabukaiSite: SiteConfig = {
  name: '社会保障審議会（障害者部会）',
  url: 'https://www.mhlw.go.jp/stf/shingi/shingi-hosho_126730.html',
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

      const dateMatch = rawDate.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
      if (!dateMatch) return;
      const date = dateMatch[1];

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
        title: `社会保障審議会（障害者部会） ${label}`,
        link,
        guid: `mhlw-shougaishabukai-${session || 'extra'}-${date}`,
        date,
        description: agenda,
      });
    });

    return items.slice(0, 20);
  },
};
