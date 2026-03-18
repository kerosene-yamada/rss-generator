import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { geminiSites, xserverSites } from './scrapers';
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
  const mode = process.env.RUN_MODE ?? 'rss';

  if (mode === 'gov-report') {
    console.log('Mode: gov-report');
    await runGovReport();
    return;
  }

  console.log('Mode: rss');
  const outputDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
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

  // XServer Driveフィード
  const xserverItems = await fetchAndScrape(xserverSites);
  console.log(`XServer items: ${xserverItems.length}`);
  fs.writeFileSync(
    path.join(outputDir, 'xserver-feed.xml'),
    generateRss(
      xserverItems,
      'XServer Drive 障害・メンテナンス情報',
      'https://kerosene-yamada.github.io/rss-generator/xserver-feed.xml',
    ),
    'utf-8',
  );
  console.log('Written: docs/xserver-feed.xml');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
