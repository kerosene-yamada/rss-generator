import axios from 'axios';
import * as cheerio from 'cheerio';
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

    // Step1: GETでセッションCookieと隠しフォームフィールドを取得
    const getRes = await axios.get(site.loginUrl, {
      headers: {'User-Agent': axiosConfig.headers['User-Agent']},
      responseType: 'arraybuffer' as const,
      validateStatus: (status) => status < 400,
    });
    const initCookies: string[] =
      (getRes.headers['set-cookie'] as string[]) ?? [];
    const initCookieStr = initCookies
      .map((c: string) => c.split(';')[0])
      .join('; ');
    console.log(`  Session cookie: ${initCookieStr || '(none)'}`);

    // ログインフォームの隠しフィールド（CSRFトークン等）を取得
    const loginHtml = Buffer.from(getRes.data).toString('utf-8');
    const $form = cheerio.load(loginHtml);
    const hiddenFields: Record<string, string> = {};
    $form('form input[type="hidden"]').each((_: unknown, el: any) => {
      const name = $form(el).attr('name');
      const value = $form(el).attr('value') ?? '';
      if (name) hiddenFields[name] = value;
    });
    if (Object.keys(hiddenFields).length > 0) {
      console.log(
        `  Hidden fields found: ${Object.keys(hiddenFields).join(', ')}`,
      );
    }

    // Step2: 隠しフィールド＋認証情報でPOSTログイン
    const postData = new URLSearchParams({...hiddenFields, ...credentials});
    const loginRes = await axios.post(site.loginUrl, postData, {
      headers: {
        'User-Agent': axiosConfig.headers['User-Agent'],
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: site.loginUrl,
        ...(initCookieStr ? {Cookie: initCookieStr} : {}),
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400,
    });

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

    // ログイン成功後にリダイレクト先URLを追跡
    const redirectUrl = loginRes.headers['location']
      ? new URL(loginRes.headers['location'] as string, site.loginUrl).href
      : null;
    if (redirectUrl) {
      console.log(`  Login redirect -> ${redirectUrl}`);
      await axios.get(redirectUrl, {
        headers: {...axiosConfig.headers, Cookie: cookieStr},
        maxRedirects: 3,
        validateStatus: (status) => status < 400,
      });
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

async function uploadToGist(xmlContent: string): Promise<void> {
  const gistId = process.env.GIST_ID;
  const gistToken = process.env.GIST_TOKEN;

  if (!gistId || !gistToken) {
    console.warn(
      'GIST_ID / GIST_TOKEN が未設定のためGistへのアップロードをスキップします',
    );
    return;
  }

  await axios.patch(
    `https://api.github.com/gists/${gistId}`,
    {files: {'hug-feed.xml': {content: xmlContent}}},
    {
      headers: {
        Authorization: `Bearer ${gistToken}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  console.log(`Uploaded: hug-feed.xml -> gist:${gistId}`);
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
  const hugXml = generateRss(
    hugItems,
    'HUG リリースノート',
    `https://gist.githubusercontent.com/${process.env.GIST_OWNER ?? 'me'}/raw/hug-feed.xml`,
  );
  await uploadToGist(hugXml);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
