import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { sites } from './scrapers';
import { generateRss } from './rssGenerator';
import { FeedItem, SiteConfig } from './types';
import { runGovReport } from './govReport';

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

      let html: string;
      if (site.url.includes('xserver')) {
        const iconv = await import('iconv-lite').catch(() => null);
        if (iconv) {
          html = iconv.decode(Buffer.from(response.data), 'EUC-JP');
        } else {
          html = Buffer.from(response.data).toString('utf-8');
        }
      } else {
        html = Buffer.from(response.data).toString('utf-8');
      }

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
  // どのモードで実行するか環境変数で切り替え
  // GitHub Actionsのワークフローから "rss" または "gov-report" を渡す
  const mode = process.env.RUN_MODE ?? 'rss';

  if (mode === 'gov-report') {
    // 週1回：Gemini APIでレポート生成→Slack投稿
    console.log('Mode: gov-report');
    await runGovReport();
    return;
  }

  // デフォルト: RSSフィード生成
  console.log('Mode: rss');
  const outputDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const items = await fetchAndScrape(sites);
  console.log(`Total items: ${items.length}`);
  const feedUrl = 'https://kerosene-yamada.github.io/rss-generator/feed.xml';
  fs.writeFileSync(
    path.join(outputDir, 'feed.xml'),
    generateRss(items, 'リリースノート まとめ RSS', feedUrl),
    'utf-8',
  );
  console.log('Written: docs/feed.xml');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
