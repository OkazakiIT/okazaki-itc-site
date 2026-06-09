# CLAUDE.md — 岡﨑ＩＴコンサルティング 名刺サイト

個人事業主（岡﨑 好信 / 岡﨑ＩＴコンサルティング株式会社）の「名刺代わり」1ページ静的サイト。
HTML / CSS / JS のみ。AWS S3 + CloudFront などの静的ホスティングを想定。モバイルファースト。

- リポジトリ: GitHub `MetamoL/okazaki-itc-site`（Private）。最終的にクライアントへ譲渡予定（譲渡後、制作側は共同編集者として残る）。
- 公開対象: `index.html` / `css/` / `js/` / `images/` / favicon類 / `ogp.jpg` / `robots.txt` / `sitemap.xml`
- 非公開（リポジトリに含めない）: `client_source/`（依頼主の私的資料。`.gitignore` 済）

---

## ★ 開発ハーネス：Planner / Generator / Evaluator は「独立」させる（最重要・厳守）

このプロジェクトでは、3つの役割を **必ず独立したサブエージェント（Agent ツールで別コンテキスト起動）** として実行する。
**メインのエージェント（オーケストレーター）が役割を兼任（インラインで演じ分け）してはならない。**

### オーケストレーター（メイン）の責務
- 各役割のサブエージェントを **起動し、文脈を渡し、フィードバックを橋渡しする** だけ。
- 自分で Planner / Generator / Evaluator の作業（仕様作り・実装・QA判定）を **やらない**。
- サブエージェントはコールドスタート（前の文脈を引き継がない）。プロンプトに前提を **毎回すべて** 入れる：
  プロジェクトパス（`C:\claude\business_card_site`）／サイト概要・制約／該当タスク／評価ルーブリック。
- 原則 **フォアグラウンド** で起動し、結果を受け取って次の役割へ回す。Evaluator の指摘は **そのまま** 次の Generator に渡す。

### 役割定義
- **Planner（独立）**：要件 → 製品仕様(PRD)＋スプリント計画。「何を作るか」に集中し、実装詳細（タグ／クラス名／CSS）に踏み込まない。`subagent_type` の目安＝`Plan`。
- **Generator（独立）**：仕様に基づき 1 回につき 1 スプリント（または 1 指摘群）を実装。ファイルを編集する。**自己承認しない**。`subagent_type`＝`general-purpose`。
- **Evaluator（独立）**：Generator の成果を独立に QA。**ブラウザ実機**（Claude Preview MCP／`launch.json` の `business-card`／port 8123）＋静的解析で、**閾値付きルーブリック**に照らし PASS/FAIL 判定。辛口・ラバースタンプ禁止。**ファイルは変更しない**。`subagent_type`＝`general-purpose`。

### ループ
1. 新規要件 → **Planner** 起動 → 仕様／計画。
2. 各スプリント → **Generator** 起動（仕様＋文脈を渡す）→ 実装。
3. **Evaluator** 起動 → 独立 QA。**1 項目でも閾値割れ＝不合格** → 指摘をそのまま次の Generator に渡して修正。**PASS まで反復**。
4. PASS で次スプリントへ。

### Evaluator ルーブリック（各項目に閾値、PASS/FAIL）
1. 要件一致（必要セクションが揃い実データが入っている）
2. レスポンシブ（375 / 768 / 1024px で横スクロール・崩れ 0）
3. コンソール 0 件・JS 無効でも本文が読めるフォールバック
4. アクセシビリティ（alt／見出し階層の論理性／コントラスト比 4.5:1 以上／`:focus-visible`／aria／`prefers-reduced-motion`）
5. インタラクション（ハンバーガー開閉・aria 同期・Esc/リンクで閉じる・スムーススクロール・出現アニメ）
6. SEO / 共有（title・description・OGP・canonical・favicon・robots・sitemap）
7. パフォーマンス（画像サイズ・lazy・レンダリングブロック）
8. コード品質 / 保守性（セマンティック・未使用 CSS・デプロイ前 TODO）

---

## 環境・動作確認の要点
- **node / python が無い環境**のため、プレビューは PowerShell の簡易静的サーバー（`.claude/static-server.ps1`）。`launch.json` の設定名 **`business-card`**（port 8123）で起動。
- `.ps1` は **ASCII のみ**で書く（Windows PowerShell 5.1 が CP932 で読み、日本語コメントを壊して構文エラーにするため）。
- 画像最適化・OGP/favicon 生成は **.NET System.Drawing**（PowerShell）で実施（外部ツール不要）。
- 日本語を含む git コミットメッセージは **UTF-8 ファイル＋`git commit -F`** で渡す（PowerShell の引数経由は文字化けし得る）。氏名は **「岡﨑」（﨑＝立つ崎）** で統一。

## トレードオフ（承知の上で運用）
- 独立サブエージェントはインライン作業より **遅く・高コスト**。これは独立性と第三者 QA の厳密さを得るための **意図的な選択**。
- 実際、独立 Evaluator は実装者が見落とした不備（ヒーロー lead のコントラスト 4.49:1、`:focus-visible` 欠如、未使用 CSS 等）を検出した実績あり。

## 現在地（随時更新）
- Sprint 0〜8 ＋ 完成度向上 Sprint A〜D 完了。すべて独立ハーネス（独立Generator→独立Evaluator）で QA 合格・退行ゼロ。
  - A: ヒーローのフレーズ単位改行・余白／ナビ現在地ハイライト(aria-current)／セクション区切り
  - B: 数字ストリップ(30年以上/12年/2010年〜/2013年)／新聞カードの contain 全面表示／CTA文言＋mailto件名・本文プリセット
  - C: スキップリンク／モバイルメニューのフォーカス管理(閉時フォーカス不可化＋復帰)／`404.html`／印刷スタイル
  - D: JSON-LD(Person+Organization)／ヒーローLCP最適化(preload＋fetchpriority)。WebPは環境にエンコーダ無く見送り(壊れ参照なし)
- **公開済み（GitHub Pages）**：**https://metamol.github.io/okazaki-itc-site/**（Public・`main`/root配信・`.nojekyll`・HTTPS強制。`git push`で自動再デプロイ）
- **共同編集者**：`OkazakiIT` を write 権限で招待済み（**承諾待ち**）。承諾後は両者で保守可。
- 残タスク（任意）：所有権を `OkazakiIT` へ譲渡（→Pages URL が変わるため OGP/canonical/robots/sitemap/404 の絶対URL差し替えが必要）／独自ドメイン導入／WebP化（エンコーダ入手時）。
- 保守フロー：ファイル編集 → `git commit` → `git push`（main）で本番反映。
