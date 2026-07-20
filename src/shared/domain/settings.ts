/**
 * Model: アプリ設定。通知の ON/OFF と期限通知のリードタイムを持つ。
 * 端末ごとのローカル設定として userData/settings.json に保存する。
 */

export interface AppSettings {
  /** デスクトップ通知を出すか */
  notificationsEnabled: boolean
  /** 期限が近いと判定するリードタイム（分）。終了時刻の何分前に通知するか */
  deadlineLeadMinutes: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  deadlineLeadMinutes: 60
}
