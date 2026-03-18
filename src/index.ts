import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { sites } from './scrapers';
import { govSites } from './govScrapers';
import { generateRss } from './rssGenerator';
import { FeedItem, SiteConfig } from './types';

const axiosConfig = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; RSSBot/1.0; +https://github.com/YOUR_USERNAME/YOUR_REPO)',
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
  console.log('Starting RSS generation...');

  const outputDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // フィード1: サービス系リリースノート
  const items = await fetchAndScrape(sites);
  console.log(`Total items (services): ${items.length}`);
  const feedUrl = 'https://YOUR_USERNAME.github.io/YOUR_REPO/feed.xml';
  fs.writeFileSync(
    path.join(outputDir, 'feed.xml'),
    generateRss(items, 'リリースノート まとめ RSS', feedUrl),
    'utf-8'
  );
  console.log('Written: docs/feed.xml');

  // フィード2: 政府・行政系
  const govItems = await fetchAndScrape(govSites);
  console.log(`Total items (gov): ${govItems.length}`);
  const govFeedUrl = 'https://YOUR_USERNAME.github.io/YOUR_REPO/gov-feed.xml';
  fs.writeFileSync(
    path.join(outputDir, 'gov-feed.xml'),
    generateRss(govItems, '行政施策・審議会 まとめ RSS', govFeedUrl),
    'utf-8'
  );
  console.log('Written: docs/gov-feed.xml');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
