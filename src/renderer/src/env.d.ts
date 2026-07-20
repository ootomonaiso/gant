/// <reference types="vite/client" />
import type { AppApi } from '@shared/ipc/contract'

// preload が公開する API の型を window に載せる。
declare global {
  interface Window {
    api: AppApi
  }
}

// *.vue を TypeScript から import できるようにする。
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}
