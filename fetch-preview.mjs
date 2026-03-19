import axios from 'axios';

const urls = [
  'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/ryouyouhi_youshiki02.html',
  'https://www.mhlw.go.jp/bunya/iryouhoken/iryouhoken13/01.html',
  'https://www.mhlw.go.jp/bunya/iryouhoken/iryouhoken13/03.html',
  'https://www.cfa.go.jp/councils/shingikai/shougaiji_shien/',
  'https://www.cfa.go.jp/councils/support-personnel/',
  'https://www.cfa.go.jp/policies/shougaijishien/shisaku/',
  'https://www.mhlw.go.jp/stf/shingi/shingi-hosho_126730.html',
];

for (const url of urls) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSSBot/1.0)' },
      responseType: 'arraybuffer',
      timeout: 15000,
    });
    const html = Buffer.from(res.data).toString('utf-8');
    console.log('\n\n========== ' + url + ' ==========');
    // Extract key structural elements
    const lines = html.split('\n');
    const relevant = lines.filter(
      (l) =>
        l.includes('class=') ||
        l.includes('<ul') ||
        l.includes('<li') ||
        l.includes('<dl') ||
        l.includes('<dt') ||
        l.includes('<dd') ||
        l.includes('<table') ||
        l.includes('<tr') ||
        l.includes('<td') ||
        l.includes('<h2') ||
        l.includes('<h3') ||
        l.includes('<a href') ||
        l.match(/\d{4}年\d{1,2}月/),
    );
    console.log(relevant.slice(0, 80).join('\n'));
  } catch (e) {
    console.log('ERROR ' + url + ': ' + e.message);
  }
}
