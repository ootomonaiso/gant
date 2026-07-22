# Gant — ガントチャート型タスク管理アプリ

ガントチャートを中心に、タスクの期間・進捗・依存関係を視覚的に管理する個人用デスクトップアプリ。

- **技術構成**: Electron + Vue 3 + Vite + Pinia + SQLite（better-sqlite3）
- **アーキテクチャ**: MVVM を全レイヤで一貫採用 → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **要件定義**: [`docs/requirements.md`](docs/requirements.md)

## 必要環境

- Node.js 20 以上（開発は 22 系で確認）
- **ネイティブモジュールのビルド環境**（better-sqlite3 を Electron 用に再ビルドするため）
  - Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/ja/downloads/)（「C++ によるデスクトップ開発」）と Python 3.x
  - macOS: Xcode Command Line Tools

## セットアップ

```bash
npm install
npm run rebuild   # better-sqlite3 を Electron の ABI に合わせて再ビルド（初回・electron 更新時に必要）
```

> `npm run rebuild` を忘れると、起動時に「NODE_MODULE_VERSION の不一致」でクラッシュする。その場合はこのコマンドを実行する。

## 開発

```bash
npm run dev        # ホットリロード付きで Electron を起動
npm run typecheck  # 型チェック（main/preload と renderer の両方）
npm test           # 純粋ロジックのユニットテスト（Vitest）
npm run e2e        # 実機 e2e（Playwright でビルド済みアプリを操作、e2e/shots/ にスクショ）
```

- `npm test` … timescale / drag / notificationRules / taskTree / taskFilter / deadline を Node 上で検証。
- `npm run e2e` … 本物の SQLite ごと起動し、プロジェクト/タスク作成・階層・依存・カンバン D&D を操作して
  各ビューのスクリーンショットを撮る（`e2e/shots/` は Git 管理外）。使い捨ての userData を使う。

## ビルド

```bash
npm run build      # out/ に本番ビルドを生成
npm run start      # ビルド済みをプレビュー起動
```

## 配布用パッケージング

```bash
npm run dist       # release/ に Windows インストーラ（Gant Setup <ver>.exe）を生成
npm run dist:dir   # インストーラなしの展開済みアプリ（release/win-unpacked/）だけを生成
```

- `better-sqlite3`（ネイティブ）は electron-builder が対象 Electron 用に再ビルドし、
  asar から取り出して同梱する（`asarUnpack`）。
- **署名はしていない**（証明書未設定なので自動スキップ）。配布時は SmartScreen 警告が出る。
- **Windows の制約回避**: exe 編集/署名に使う electron-builder の `winCodeSign` キャッシュは
  macOS 用シンボリックリンクを含み、Windows で Developer Mode/管理者権限がないと展開に失敗する。
  そのため `build.win.signAndEditExecutable: false` を設定して回避している。
  署名や exe メタデータ編集を行いたい場合（CI や Developer Mode 有効環境）は、このフラグを外す。

## データの保存場所

SQLite の単一ファイル `gant.db` を OS のユーザーデータ領域に保存する（`app.getPath('userData')`）。

- Windows: `%APPDATA%/gant/gant.db`（配布版は productName の `Gant`、開発版は `gant`）
- macOS: `~/Library/Application Support/gant/gant.db`

バックアップはこのファイルをコピーするか、**設定ダイアログの「データ」からエクスポート（JSON）**する。
インポートは新しい ID を採番して追加するので、既存データを壊さない。

## ディレクトリ構成 / 拡張方法

レイヤの責務、依存の向き、機能追加の手順（下から上に足すレシピ）は
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) に集約している。**コードを触る前に必ず一読すること。**

```
src/
├─ shared/     ドメイン型 + IPC 契約（main/renderer 共有・フレームワーク非依存）
├─ main/       Electron main：SQLite / Repository / IPC / 通知エンジン / 設定 / バックアップ（= Model）
├─ preload/    contextBridge で API を公開（= 境界）
└─ renderer/   Vue：views/components（View）, viewmodels（ViewModel）, gateways
```

> **開発中の注意（スキーマ変更あり）**: ID を UUID 化し `deleted_at` を追加したため、
> 以前のバージョンで作った `gant.db` とは互換性がない。開発中に古い DB が残っている場合は
> `%APPDATA%/gant/gant.db*` を削除してから起動する（再作成される）。

## 実装状況（フェーズ）

- [x] フェーズ1: 基盤疎通 + プロジェクト/タスクの CRUD（リスト表示）
- [x] フェーズ2: ガント v1（SVG 描画・今日ライン・ズーム 時/日/週/月・期限警告）
- [x] フェーズ3: バーのドラッグ編集（移動・端リサイズ・スナップ）
- [x] 追加: デスクトップ通知（開始/期限接近/期限超過/個別リマインダー）＋設定画面
- [x] 追加: 同期に備えたデータ設計（UUID 主キー・updated_at・soft delete）
- [x] フェーズ4: サブタスク階層（折りたたみ・親子）＋依存関係の矢印
- [x] フェーズ5: カンバンビュー・フィルタ/検索・期限のビジュアル警告（超過/間近）
- [x] フェーズ6: エクスポート/インポート（JSON）＋ Windows インストーラのパッケージング
