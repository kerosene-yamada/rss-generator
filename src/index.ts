import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { sites } from './scrapers';
import { generateRss } from './rssGenerator';
import { FeedItem } from './types';

// EUC-JPなど文字コードが異なるサイト向けのヘッダー設定
const axiosConfig = {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (compatible; RSSBot/1.0; +https://github.com/kerosene-yamada/rss-generator)',
  },
  timeout: 15000,
  // axiosはデフォルトでUTF-8として扱うため、EUC-JPサイトは別途対応
  responseType: 'arraybuffer' as const,
};

async function fetchAndScrape(): Promise<FeedItem[]> {
  const allItems: FeedItem[] = [];

  for (const site of sites) {
    try {
      console.log(`Fetching: ${site.name}`);
      const response = await axios.get(site.url, axiosConfig);

      // EUC-JPサイトはデコード（drive.xserver.ne.jp）
      let html: string;
      if (site.url.includes('xserver')) {
        // Node.js標準のBufferでEUC-JPをデコード
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
      // エラーが出てもほかのサイトの処理を続ける
      if (error instanceof Error) {
        console.error(`  Error fetching ${site.name}: ${error.message}`);
      }
    }
  }

  return allItems;
}

async function main(): Promise<void> {
  console.log('Starting RSS generation...');

  const items = await fetchAndScrape();
  console.log(`Total items collected: ${items.length}`);

  // GitHub PagesのURL（デプロイ後に自分のURLに変更してください）
  const feedUrl = 'https://kerosene-yamada.github.io/rss-generator/feed.xml';

  const rssContent = generateRss(items, 'リリースノート まとめ RSS', feedUrl);

  // docs/feed.xml に出力（GitHub Pagesはdocsフォルダを使う）
  const outputDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'feed.xml');
  fs.writeFileSync(outputPath, rssContent, 'utf-8');

  console.log(`RSS feed written to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
