# RSS Feed Generator

RSSフィードを持たないサイトを定期スクレイピングして、Feedlyなどで読めるRSSフィードを自動生成します。

## 監視サイト

| サービス | URL |
|---|---|
| Gemini API リリースノート | https://ai.google.dev/gemini-api/docs/changelog |
| kintone アップデート情報 | https://jp.kintone.help/k/ja/update/all |
| XServer Drive お知らせ | https://drive.xserver.ne.jp/support/news/ |
| Microsoft 365 更新履歴 | https://learn.microsoft.com/ja-jp/officeupdates/update-history-microsoft365-apps-by-date |
| Microsoft 365 セキュリティ更新 | https://learn.microsoft.com/ja-jp/officeupdates/microsoft365-apps-security-updates |
| cybozu.dev kintone API 更新 | https://cybozu.dev/ja/kintone/news/api-updates/ |

## セットアップ手順

### 1. リポジトリの作成

1. GitHubで新しいパブリックリポジトリを作成（例: `rss-generator`）
2. このコードをプッシュ

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. `src/index.ts` のURLを書き換え

```ts
// この行を自分のリポジトリのURLに変更
const feedUrl = 'https://YOUR_USERNAME.github.io/YOUR_REPO/feed.xml';
```

### 3. GitHub Pages を有効化

- リポジトリの `Settings` → `Pages`
- Source: `Deploy from a branch`
- Branch: `main` / `docs` フォルダ
- Save

### 4. GitHub Actions を有効化

- リポジトリの `Actions` タブ → ワークフローを有効化
- 手動実行: `Run workflow` で初回テスト

### 5. FeedlyにRSSを登録

```
https://YOUR_USERNAME.github.io/YOUR_REPO/feed.xml
```

## ローカルでの動作確認

```bash
npm install
npm start
# docs/feed.xml が生成されたか確認
```

## サイトの追加方法

`src/scrapers.ts` に新しいエントリを追加するだけです。

```ts
{
  name: 'サービス名',
  url: 'https://example.com/news',
  scraper: (html, baseUrl) => {
    const $ = cheerio.load(html);
    const items: FeedItem[] = [];
    // cheerioでスクレイピング
    $('h2').each((_, el) => {
      items.push({
        title: $(el).text(),
        link: baseUrl,
        date: new Date().toUTCString(),
      });
    });
    return items;
  },
},
```

## APIキーが必要なサイトを追加する場合

GitHub Secretsを使います：

1. リポジトリの `Settings` → `Secrets and variables` → `Actions`
2. `New repository secret` で `MY_API_KEY` などを追加
3. ワークフローYMLで参照：

```yaml
env:
  MY_API_KEY: ${{ secrets.MY_API_KEY }}
```

4. TypeScript内で `process.env.MY_API_KEY` として使用
