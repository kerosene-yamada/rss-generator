import * as cheerio from 'cheerio';
import {FeedItem, SiteConfig} from './types';

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

// kintoneプラグイン提供元(Ribbit)のお知らせ。RSS未提供のためスクレイピング
export const pluginSites: SiteConfig[] = [
  {
    name: 'Ribbit App Development お知らせ',
    url: 'https://konomi.app/posts',
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      $('a[href^="/posts/"]').each((_, el) => {
        const title = $(el).find('h2').text().trim();
        const date = $(el).find('time').text().trim();
        if (!title || !date) return;

        const link = new URL($(el).attr('href') ?? '', baseUrl).toString();
        items.push({
          title: `Ribbit: ${title}`,
          link,
          guid: link,
          date,
          description: $(el).find('p').text().trim().slice(0, 200),
        });
      });

      return items.slice(0, 20);
    },
  },
  ...[
    ['smart-view', '一覧高速検索＆絞り込みプラグイン'],
    ['tooltip', 'ツールチップ プラグイン'],
    ['pdf-preview', 'PDFプレビュープラグイン'],
    // sort-subtableはページにリリースノートが無いためGitHub releases.atomを直接購読する
  ].map(([slug, label]) =>
    createRibbitReleaseNoteSite(
      label,
      `https://ribbit.konomi.app/kintone-plugin/${slug}/`,
    ),
  ),
  ...[
    ['jsedit-for-kintone-plugin', 'JSEdit for kintone'],
    ['eventcalendar-plugin', 'イベントカレンダープラグイン'],
    ['autonum-plugin', '自動採番プラグイン'],
    ['textconnect-plugin', '文字結合プラグイン'],
  ].map(([slug, label]) =>
    createCybozuSampleSite(
      label,
      `https://cybozu.dev/ja/kintone/tips/development/plugins/sample-plugin/${slug}/`,
    ),
  ),
  {
    name: '書式設定プラグイン for kintone 更新情報',
    url: 'https://adiem.jp/news-cat/cat-conditional-format/',
    scraper: (html) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      $('ol.news_list li').each((_, li) => {
        const a = $(li).find('p.title a');
        const link = a.attr('href');
        const date = $(li).find('time').text().trim().replace(/\./g, '-');
        if (!link || !date) return;

        items.push({
          title: `書式設定プラグイン: ${a.text().trim()}`,
          link,
          guid: link,
          date,
        });
      });

      return items.slice(0, 20);
    },
  },
];

// Ribbitのプラグインページ末尾「リリースノート」のカード(バージョン・日付・概要)を抽出
function createRibbitReleaseNoteSite(label: string, url: string): SiteConfig {
  return {
    name: `${label} リリースノート`,
    url,
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      $('div.tracking-tight.text-sm.font-medium').each((_, el) => {
        const version = $(el).text().trim();
        if (!version.startsWith('バージョン')) return;

        const card = $(el).closest('.rounded-lg');
        const date = card.find('span.text-xs').first().text().trim();
        if (!date) return;

        items.push({
          title: `${label}: ${version}`,
          link: baseUrl,
          guid: `${baseUrl}#${version}`,
          date,
          description: card.find('p.text-sm').text().trim().slice(0, 200),
        });
      });

      return items.slice(0, 10);
    },
  };
}

// cybozu.devのサンプルプラグインページ「更新履歴」の箇条書き(YYYY年M月D日vX.Xを公開)を抽出
function createCybozuSampleSite(label: string, url: string): SiteConfig {
  return {
    name: `${label} 更新履歴`,
    url,
    scraper: (html, baseUrl) => {
      const $ = cheerio.load(html);
      const items: FeedItem[] = [];

      const heading = $('h3')
        .filter((_, h) => $(h).text().includes('更新履歴'))
        .first();
      const list = heading.parent().nextAll('ul').first();

      list.children('li').each((_, li) => {
        const head = $(li).clone().children('ul').remove().end().text().trim();
        const m = head.match(/^(\d{4}年\d{1,2}月\d{1,2}日)\s*(v?[\d.]+)/);
        if (!m) return;

        items.push({
          title: `${label}: ${m[2]} 公開`,
          link: baseUrl,
          guid: `${baseUrl}#${m[2]}`,
          date: m[1],
          description: $(li).children('ul').text().trim().slice(0, 200),
        });
      });

      // 更新履歴は古い順のため新しい順に並べ替える
      return items.reverse().slice(0, 10);
    },
  };
}

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
