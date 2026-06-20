import { ElectronAPI } from '@electron-toolkit/preload'

interface AppConfig {
  _type: string
  _version: string
  theme: 'light' | 'dark'
}

declare global {
  interface Window {
    __INITIAL_THEME__: string
    electron: ElectronAPI
    api: {
      getUserData(): Promise<any[]>
      createRecord(data: any): Promise<void>
      updateRecord(data: any): Promise<void>
      getConfig(): Promise<AppConfig>
      saveConfig(config: AppConfig): Promise<void>
    }
  }
}
