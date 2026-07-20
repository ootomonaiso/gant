# アーキテクチャ設計書（MVVM）

最終更新: 2026-07-20

このアプリは **MVVM（Model–View–ViewModel）** を全レイヤで一貫して採用する。
「どこに何を書くか」を明確にし、他の開発者が迷わず保守・拡張できることを最優先とする。

> **原則（これを信じる）**
> 1. **View はロジックを持たない。** 見た目と入力の受け渡しだけ。
> 2. **ViewModel は DOM を知らない。** 状態と操作（コマンド）だけを持ち、単体テストできる。
> 3. **Model はフレームワークを知らない。** ドメイン型と永続化だけ。
> 4. **依存は必ず一方向。** `View → ViewModel → Gateway → (IPC) → Repository → SQLite`。逆流させない。

---

## 1. レイヤと責務

```
┌─────────────────────────── renderer プロセス ───────────────────────────┐
│                                                                          │
│   View (.vue)            ViewModel (Pinia store)        Gateway          │
│  ┌────────────┐  bind   ┌────────────────────┐  call   ┌─────────────┐   │
│  │ *.vue      │────────▶│ useXxxViewModel()   │────────▶│ xxxGateway  │   │
│  │ template   │◀────────│ state / getters /   │◀────────│ (window.api │   │
│  │ + minimal  │ observe │ commands(actions)   │ Promise │  wrapper)   │   │
│  └────────────┘         └────────────────────┘         └──────┬──────┘   │
│                                                               │ IPC       │
└───────────────────────────────────────────────────────────────┼──────────┘
                                                                │ (contextBridge)
┌─────────────────────────────── main プロセス ────────────────┼──────────┐
│                                                                │          │
│   IPC handlers            Repository (Model)         SQLite    ▼          │
│  ┌────────────┐  call    ┌────────────────────┐  SQL  ┌─────────────┐    │
│  │ channel →  │─────────▶│ ProjectRepository   │──────▶│ gant.db     │    │
│  │ repo method│          │ TaskRepository      │       │ (better-    │    │
│  └────────────┘          └────────────────────┘       │  sqlite3)   │    │
│                                                        └─────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

| レイヤ | 置き場所 | 役割 | やってはいけないこと |
|--------|----------|------|----------------------|
| **Model: ドメイン型** | `src/shared/domain` | エンティティ・値型の定義（プレーン TS） | Vue / Electron への依存 |
| **Model: 永続化** | `src/main/data` | SQLite 接続・マイグレーション・Repository | 画面・IPC の知識 |
| **境界: IPC 契約** | `src/shared/ipc` | main と renderer が共有する API 契約・チャンネル名 | 実装を持つこと |
| **境界: IPC ハンドラ** | `src/main/ipc` | チャンネル → Repository メソッドの割り当て | ビジネスロジック |
| **境界: preload** | `src/preload` | `contextBridge` で型付き API を安全に公開 | ロジック |
| **Gateway** | `src/renderer/src/gateways` | ViewModel から見た Model への唯一の入口（`window.api` を包む） | 状態を持つこと |
| **ViewModel** | `src/renderer/src/viewmodels` | 画面状態・派生値・コマンド（Pinia） | DOM 参照・テンプレート |
| **View** | `src/renderer/src/views`, `.../components` | 表示とユーザー入力の受け渡し | データ取得・業務ルール |

---

## 2. なぜこの分割なのか（保守の指針）

- **プロセス境界を Model の内側に隠す。** renderer は SQLite を一切知らない。DB を差し替えても renderer は無傷。
- **Gateway を挟む理由。** ViewModel は `window.api` を直接触らない。テスト時に Gateway をモックすれば、ViewModel を Electron 抜きで単体テストできる。
- **ViewModel = Pinia store。** Vue における「リアクティブだが View 非依存」の層はまさに ViewModel。テンプレートは持たない。
- **shared に契約を集約。** main / preload / renderer が同じ型とチャンネル名を参照するので、片方だけ直して壊れる事故を型で防ぐ。

---

## 3. データフロー（タスク作成の例）

1. **View**（`TaskListView.vue`）の「追加」ボタン → `taskVM.createDefault()` を呼ぶだけ。
2. **ViewModel**（`useTaskListViewModel`）が入力を組み立て、`taskGateway.create(input)` を呼ぶ。成功したら自身の `tasks` 配列へ push（楽観的に画面へ反映）。
3. **Gateway**（`taskGateway`）が `window.api.tasks.create(input)` を呼ぶ。
4. **preload** が `ipcRenderer.invoke('tasks:create', input)` を発行。
5. **main の IPC ハンドラ**が `TaskRepository.create(input)` を実行。
6. **Repository** が SQLite に INSERT し、作成された行をドメイン型で返す。
7. 戻り値が同じ経路を逆に流れ、ViewModel の状態が View に反映される。

---

## 4. 命名・配置のルール

- ViewModel は `useXxxViewModel.ts`、`defineStore('xxx', () => { ... })`（Setup Store 形式）で書く。
- Repository は `XxxRepository` クラス。1 テーブル 1 リポジトリを基本とする。
- IPC チャンネル名は `src/shared/ipc/channels.ts` に集約。文字列リテラルを直書きしない。
- ドメイン型は camelCase。SQLite の列は snake_case。**変換は Repository の中だけ**で行う（`toDomain` 関数）。
- 新しいユースケースを足すときの手順は本書 §6 を参照。

---

## 5. ディレクトリ構成

```
src/
├─ shared/                      # main と renderer が共有（フレームワーク非依存）
│  ├─ domain/                   # Model: ドメイン型
│  │  ├─ project.ts
│  │  └─ task.ts
│  └─ ipc/                      # 境界: IPC 契約
│     ├─ channels.ts            #   チャンネル名（唯一の真実）
│     └─ contract.ts            #   AppApi（window.api の型）
├─ main/                        # Electron main プロセス
│  ├─ index.ts                  #   エントリ（ウィンドウ生成・ライフサイクル）
│  ├─ data/                     # Model: 永続化
│  │  ├─ database.ts            #   接続（better-sqlite3）
│  │  ├─ migrations.ts          #   スキーマのバージョン管理
│  │  └─ repositories/
│  │     ├─ projectRepository.ts
│  │     └─ taskRepository.ts
│  └─ ipc/
│     └─ registerIpcHandlers.ts #   channel → repository
├─ preload/
│  └─ index.ts                  # contextBridge で AppApi を公開
└─ renderer/
   ├─ index.html
   └─ src/
      ├─ main.ts                # Vue + Pinia ブート
      ├─ App.vue
      ├─ env.d.ts               # window.api / *.vue の型
      ├─ gateways/              # ViewModel → Model の入口
      │  ├─ projectGateway.ts
      │  └─ taskGateway.ts
      ├─ viewmodels/            # ViewModel（Pinia）
      │  ├─ useProjectListViewModel.ts
      │  └─ useTaskListViewModel.ts
      ├─ views/                 # 画面（大きな単位の View）
      │  └─ MainView.vue
      ├─ components/            # 部品（小さな View）
      │  ├─ ProjectSidebar.vue
      │  ├─ TaskListView.vue
      │  └─ TaskEditorDialog.vue
      └─ styles/
         └─ main.css
```

---

## 6. 機能追加のレシピ（保守者向け）

新しい操作（例: タスクの一括完了）を足すときは、依存の流れに沿って **下から上** に追加する。

1. **契約**: `shared/ipc/channels.ts` にチャンネル名、`shared/ipc/contract.ts` に `AppApi` のメソッド型を追加。
2. **Model**: `TaskRepository` にメソッドを実装（SQL はここだけ）。
3. **ハンドラ**: `registerIpcHandlers.ts` で `ipcMain.handle(channel, ...)` を割り当て。
4. **公開**: `preload/index.ts` に `ipcRenderer.invoke(channel, ...)` を追加。
5. **Gateway**: 必要なら `gateways` に対応メソッドを通す。
6. **ViewModel**: `viewmodels` にコマンド（action）を追加。状態更新もここ。
7. **View**: `.vue` からコマンドを呼ぶだけ。ロジックは書かない。

> **ガントチャート（フェーズ2以降）** も同じ構造に載せる。ガント描画は `components/gantt/` 配下の純粋な View 部品とし、`useGanttViewModel`（時間↔座標変換・ズーム状態・ドラッグ中の一時状態を持つ）を ViewModel として追加する。描画部品は座標を受け取って SVG を描くだけにする。

---

## 7. テスト方針（推奨）

- **ViewModel**: Gateway をモックに差し替えて単体テスト（Vitest）。副作用は Gateway に閉じているので純粋にテストしやすい。
- **Repository**: インメモリ SQLite（`new Database(':memory:')`）でテスト。
- **View**: 重要なものだけ `@vue/test-utils` でスモークテスト。ロジックが無いので薄くて良い。
