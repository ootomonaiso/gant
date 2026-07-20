/**
 * Model: プロジェクト（タスクの分類単位）のドメイン型。
 * フレームワークに依存しないプレーンな型のみを置く。
 */

export interface Project {
  id: number
  name: string
  /** ガント/リストでの色分けに使う HEX カラー */
  color: string
  sortOrder: number
  /** ISO 8601 文字列 */
  createdAt: string
  updatedAt: string
}

/** 新規作成時の入力（id や日時はサーバー側=Repository が採番） */
export interface NewProject {
  name: string
  color?: string
  sortOrder?: number
}

/** 部分更新。指定したフィールドだけを更新する。 */
export interface ProjectPatch {
  name?: string
  color?: string
  sortOrder?: number
}
