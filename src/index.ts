import axios from 'axios';
import {
  geminiSites,
  mhlwAhakiSite,
  mhlwShougaifukushiSite,
  pluginSites,
} from './scrapers';
import {generateRss} from './rssGenerator';
import {FeedItem, SiteConfig} from './types';

const axiosConfig = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; RSSBot/1.0; +https://github.com/kerosene-yamada/rss-generator)',
  },
  timeout: 15000,
  responseType: 'arraybuffer' as const,
};

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

async function uploadToGist(files: Record<string, string>): Promise<void> {
  const gistId = process.env.GIST_ID;
  const gistToken = process.env.GIST_TOKEN;

  if (!gistId || !gistToken) {
    console.warn(
      'GIST_ID / GIST_TOKEN が未設定のためGistへのアップロードをスキップします',
    );
    return;
  }

  const gistFiles: Record<string, {content: string}> = {};
  for (const [filename, content] of Object.entries(files)) {
    gistFiles[filename] = {content};
  }

  await axios.patch(
    `https://api.github.com/gists/${gistId}`,
    {files: gistFiles},
    {
      headers: {
        Authorization: `Bearer ${gistToken}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  console.log(`Uploaded to gist:${gistId} -> ${Object.keys(files).join(', ')}`);
}

async function main(): Promise<void> {
  console.log('Mode: rss');

  // Gemini APIフィード
  const geminiItems = await fetchAndScrape(geminiSites);
  console.log(`Gemini items: ${geminiItems.length}`);
  const geminiXml = generateRss(
    geminiItems,
    'Gemini API リリースノート',
    `https://gist.githubusercontent.com/${process.env.GIST_OWNER ?? 'me'}/raw/gemini-feed.xml`,
  );

  // あはき療養費検討専門委員会フィード
  const ahakiItems = await fetchAndScrape([mhlwAhakiSite]);
  console.log(`MHLW Ahaki items: ${ahakiItems.length}`);
  const ahakiXml = generateRss(
    ahakiItems,
    '社会保障審議会 あはき療養費検討専門委員会',
    `https://gist.githubusercontent.com/${process.env.GIST_OWNER ?? 'me'}/raw/mhlw-ahaki-feed.xml`,
  );

  // 障害福祉サービス等報酬改定検討チームフィード
  const shougaifukushiItems = await fetchAndScrape([mhlwShougaifukushiSite]);
  console.log(`MHLW Shougaifukushi items: ${shougaifukushiItems.length}`);
  const shougaifukushiXml = generateRss(
    shougaifukushiItems,
    '障害福祉サービス等報酬改定検討チーム',
    `https://gist.githubusercontent.com/${process.env.GIST_OWNER ?? 'me'}/raw/mhlw-shougaifukushi-feed.xml`,
  );

  // kintoneプラグイン更新・セキュリティ情報フィード
  const pluginItems = await fetchAndScrape(pluginSites);
  console.log(`Plugin items: ${pluginItems.length}`);
  const pluginXml = generateRss(
    pluginItems,
    'kintoneプラグイン 更新・セキュリティ情報',
    `https://gist.githubusercontent.com/${process.env.GIST_OWNER ?? 'me'}/raw/plugin-updates-feed.xml`,
  );

  await uploadToGist({
    'plugin-updates-feed.xml': pluginXml,
    'gemini-feed.xml': geminiXml,
    'mhlw-ahaki-feed.xml': ahakiXml,
    'mhlw-shougaifukushi-feed.xml': shougaifukushiXml,
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
