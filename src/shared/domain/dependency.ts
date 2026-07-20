/**
 * Model: タスク依存関係のドメイン型。
 * 最初は FS（先行タスクの終了 → 後続タスクの開始）のみ対応する。
 * id / 参照は同期に備えて UUID（文字列）。
 */

export type DependencyType = 'FS'

export interface Dependency {
  id: string
  /** 先行タスク */
  predecessorId: string
  /** 後続タスク */
  successorId: string
  type: DependencyType
}

export interface NewDependency {
  predecessorId: string
  successorId: string
  type?: DependencyType
}
