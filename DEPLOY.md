# デプロイ手順 & リリース前チェックリスト（AWS S3 + CloudFront）

静的サイト（HTML / CSS / JS）を S3 に置き、CloudFront で配信する前提の手順。

---

## 1. リリース前 TODO（公開前に必ず対応）

### 1-1. プレースホルダーの差し替え（要・依頼主情報）
- [x] **連絡先メール**：`oka87005@hotmail.co.jp` を mailto＋表示に設定済み。
- [x] **SNSリンク**：未提供のためダミーを削除（メール導線に集約）。実アカウントがあれば追加可。
- [x] **キャッチコピー**：「生産管理からＩＴ・人材育成まで。ものづくりに、伴走する。」で確定。
- [x] **自己紹介/経歴**：自己紹介(docx)・職務経歴・会社紹介スライドの内容を反映済み。
- [x] **正面ポートレート写真**：`images/profile.jpg` を正面ポートレートに差し替え済み。
- [x] **メディア掲載**：NHK WORLD・新聞掲載を実績セクションに追加済み。
- [ ] **本番ドメイン**：`https://example.com` を実ドメインに一括置換。
  - 対象: `index.html`（og:url / og:image / canonical）、`robots.txt`、`sitemap.xml`

### 1-2. 仕上げ確認
- [ ] `index.html` の `[ Sprint x で実装 ]` 等の残骸が無いこと（現在は無し）。
- [ ] 375 / 768 / 1280px で横スクロールが無いこと。
- [ ] ブラウザのコンソールにエラーが無いこと。
- [ ] OGP確認（X/Facebookのシェアデバッガに本番URLを通す）。

---

## 2. アップロードするファイル / しないファイル

**アップロードする（公開対象）**
```
index.html
css/style.css
js/main.js
images/*.jpg
favicon.svg / favicon-32.png / apple-touch-icon.png
ogp.jpg
robots.txt / sitemap.xml
```

**アップロードしない**
```
client_source/   ← 依頼主の素材原本（PDF・原寸画像など）
.claude/         ← 開発用（検証サーバー等）
README.md / REQUIREMENTS 系 / DEPLOY.md  ← ドキュメント
```

---

## 3. S3 + CloudFront 手順（概要）

> 推奨：S3バケットは**非公開**のまま、CloudFront の **OAC（Origin Access Control）** 経由で配信（バケットを公開Webホスティングにしない構成）。

1. **S3バケット作成**：リージョン任意。パブリックアクセスはブロックのまま。
2. **ファイルをアップロード**：上記「アップロードする」一式を、ディレクトリ構造を保ってアップロード。
3. **CloudFrontディストリビューション作成**：
   - オリジン = 当該S3バケット（OACを作成して付与）。
   - デフォルトルートオブジェクト = `index.html`。
   - ビューワープロトコル = Redirect HTTP to HTTPS。
4. **バケットポリシー**：CloudFront(OAC)からの `s3:GetObject` のみ許可（コンソールが生成するポリシーを貼る）。
5. **独自ドメイン**（任意）：ACM（us-east-1）で証明書発行 → CloudFrontの代替ドメイン名(CNAME)に設定 → DNSをCloudFrontへ。
6. **公開後**：本番URLでOGP・表示・リンクを最終確認。

### キャッシュの目安（Cache-Control）
| 種類 | 推奨 |
|---|---|
| `index.html` | `no-cache`（または短め）。更新を即反映するため。 |
| `css/` `js/` `images/` 等 | `max-age=31536000, immutable`（長期）。更新時はファイル名を変える or 無効化。 |

- 内容を差し替えたら **CloudFrontのキャッシュ無効化（Invalidation）**：`/index.html`（必要なら `/*`）。

---

## 4. 画像最適化メモ
- 公開画像は原寸（client_source）から縮小・再圧縮済み（hero 3.1MB→約150KB 等、合計 約470KB）。
- さらに軽くするなら WebP 化も可（対応ブラウザ広い）。必要なら対応します。
