import {FeedItem} from './types';

// XML特殊文字をエスケープ
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 日付文字列をRFC 822形式に変換（Slack等のRSSパーサー対応）
function toRfc822(dateStr: string): string {
  // "2026年03月18日" → Date に変換
  const normalized = dateStr.replace(
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    '$1-$2-$3',
  );
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

export function generateRss(
  items: FeedItem[],
  feedTitle: string,
  feedUrl: string,
): string {
  const now = new Date().toUTCString();

  const itemsXml = items
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid ?? item.link)}</guid>
      <pubDate>${toRfc822(item.date)}</pubDate>
      ${item.description ? `<description>${escapeXml(item.description)}</description>` : ''}
    </item>`,
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
