import { ElectronAPI } from '@electron-toolkit/preload'

interface AppConfig {
  _type: string
  _version: string
  theme: 'light' | 'dark'
  lastRecordId?: string
}

declare global {
  interface Window {
    __INITIAL_THEME__: string
    electron: ElectronAPI
    api: {
      getUserData(): Promise<any[]>
      createRecord(data: any): Promise<void>
      updateRecord(data: any): Promise<void>
      deleteRecord(id: string): Promise<boolean>
      onTestKeyEvent(callback: (data: { type: 'keydown' | 'keyup'; code: string; repeat?: boolean }) => void): () => void
      setTestMode(active: boolean): void
      setBackgroundRecording(active: boolean): Promise<boolean>
      getKeyStats(recordId: string): Promise<Record<string, number> | null>
      saveKeyStats(recordId: string, recordName: string, counts: Record<string, number>): Promise<Record<string, number>>
      getConfig(): Promise<AppConfig>
      saveConfig(config: AppConfig): Promise<void>
    }
  }
}
