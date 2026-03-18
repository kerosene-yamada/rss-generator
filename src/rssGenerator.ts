import { FeedItem } from './types';

// XML特殊文字をエスケープ
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateRss(items: FeedItem[], feedTitle: string, feedUrl: string): string {
  const now = new Date().toUTCString();

  const itemsXml = items
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <pubDate>${item.date}</pubDate>
      ${item.description ? `<description>${escapeXml(item.description)}</description>` : ''}
    </item>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(feedUrl)}</link>
    <description>複数サービスのリリースノート・お知らせをまとめたRSSフィード</description>
    <language>ja</language>
    <lastBuildDate>${now}</lastBuildDate>
    ${itemsXml}
  </channel>
</rss>`;
}
