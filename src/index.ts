import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {geminiSites, hugCopainSite} from './scrapers';
import {generateRss} from './rssGenerator';
import {FeedItem, SiteConfig, LoginSiteConfig} from './types';
import {runGovReport} from './govReport';

const axiosConfig = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; RSSBot/1.0; +https://github.com/kerosene-yamada/rss-generator)',
  },
  timeout: 15000,
  responseType: 'arraybuffer' as const,
};

async function fetchAndScrapeWithLogin(
  site: LoginSiteConfig,
  credentials: Record<string, string>,
): Promise<FeedItem[]> {
  try {
    console.log(`Fetching (with login): ${site.name}`);

    // 認証情報が空の場合は早期エラー
    if (!credentials.username || !credentials.password) {
      console.error(`  Error: HUG_USER / HUG_PASS が設定されていません`);
      return [];
    }

    // Step1: GETでセッションCookieを取得
    const getRes = await axios.get(site.loginUrl, {
      headers: {'User-Agent': axiosConfig.headers['User-Agent']},
      validateStatus: (status) => status < 400,
    });
    const initCookies: string[] =
      (getRes.headers['set-cookie'] as string[]) ?? [];
    const initCookieStr = initCookies
      .map((c: string) => c.split(';')[0])
      .join('; ');
    console.log(`  Session cookie: ${initCookieStr || '(none)'}`);

    // Step2: セッションCookieを引き継いでPOSTログイン
    const loginRes = await axios.post(
      site.loginUrl,
      new URLSearchParams(credentials),
      {
        headers: {
          'User-Agent': axiosConfig.headers['User-Agent'],
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: site.loginUrl,
          ...(initCookieStr ? {Cookie: initCookieStr} : {}),
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      },
    );

    console.log(`  Login status: ${loginRes.status}`);

    // POST後のSet-CookieとGET時のCookieをマージ
    const postCookies: string[] =
      (loginRes.headers['set-cookie'] as string[]) ?? [];
    const cookieMap = new Map<string, string>();
    [...initCookies, ...postCookies].forEach((c: string) => {
      const part = c.split(';')[0];
      const [key] = part.split('=');
      cookieMap.set(key.trim(), part);
    });
    const cookieStr = Array.from(cookieMap.values()).join('; ');

    if (!cookieStr) {
      console.error(
        `  Error: ログイン後にCookieが取得できませんでした（認証情報を確認してください）`,
      );
      return [];
    }

    console.log(`  Cookie acquired, fetching: ${site.url}`);

    const res = await axios.get(site.url, {
      headers: {
        ...axiosConfig.headers,
        Cookie: cookieStr,
      },
      responseType: 'arraybuffer' as const,
    });

    const html = Buffer.from(res.data).toString('utf-8');

    // ログインページにリダイレクトされていたら認証失敗
    if (html.includes('name="username"') || html.includes('name="password"')) {
      console.error(
        `  Error: ログインに失敗しました（ログインページにリダイレクトされました）`,
      );
      return [];
    }

    const items = site.scraper(html, site.url);
    console.log(`  -> Found ${items.length} items`);
    return items;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`  Error fetching ${site.name}: ${error.message}`);
    }
    return [];
  }
}

async function fetchAndScrape(targetSites: SiteConfig[]): Promise<FeedItem[]> {
  const allItems: FeedItem[] = [];

  for (const site of targetSites) {
    try {
      console.log(`Fetching: ${site.name}`);
      const response = await axios.get(site.url, axiosConfig);

      const html = Buffer.from(response.data).toString('utf-8');

      const items = site.scraper(html, site.url);
      console.log(`  -> Found ${items.length} items`);
      allItems.push(...items);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`  Error fetching ${site.name}: ${error.message}`);
      }
    }
  }

  return allItems;
}

async function main(): Promise<void> {
  const mode = process.env.RUN_MODE ?? 'rss';

  if (mode === 'gov-report') {
    console.log('Mode: gov-report');
    await runGovReport();
    return;
  }

  console.log('Mode: rss');
  const outputDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }

  // Gemini APIフィード
  const geminiItems = await fetchAndScrape(geminiSites);
  console.log(`Gemini items: ${geminiItems.length}`);
  fs.writeFileSync(
    path.join(outputDir, 'gemini-feed.xml'),
    generateRss(
      geminiItems,
      'Gemini API リリースノート',
      'https://kerosene-yamada.github.io/rss-generator/gemini-feed.xml',
    ),
    'utf-8',
  );
  console.log('Written: docs/gemini-feed.xml');

  // HUG リリースノートフィード
  const hugItems = await fetchAndScrapeWithLogin(hugCopainSite, {
    username: process.env.HUG_USER ?? '',
    password: process.env.HUG_PASS ?? '',
  });
  console.log(`HUG items: ${hugItems.length}`);
  fs.writeFileSync(
    path.join(outputDir, 'hug-feed.xml'),
    generateRss(
      hugItems,
      'HUG リリースノート',
      'https://kerosene-yamada.github.io/rss-generator/hug-feed.xml',
    ),
    'utf-8',
  );
  console.log('Written: docs/hug-feed.xml');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
