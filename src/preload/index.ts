import { contextBridge,ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 从主进程启动参数中读取初始主题（消除启动闪屏）
const themeArg = process.argv.find(arg => arg.startsWith('--app-theme='))
const initialTheme: string = themeArg ? themeArg.split('=')[1] : 'light'

// Custom APIs for renderer
const api = {
  getUserData(){
    return ipcRenderer.invoke('get-user-data')
  },
  createRecord(data: any){
    return ipcRenderer.invoke('create-record',data)
  },
  updateRecord(data: any){
    return ipcRenderer.invoke('update-record',data)
  },
  deleteRecord(id: string){
    return ipcRenderer.invoke('delete-record',id)
  },
  // 订阅主进程转发的原始按键事件（before-input-event 转发全部按键 + PrintScreen 全局快捷键），返回取消订阅函数
  onTestKeyEvent(callback: (data: { type: 'keydown' | 'keyup'; code: string; repeat?: boolean }) => void){
    const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on('raw-key-event', listener)
    return () => {
      ipcRenderer.removeListener('raw-key-event', listener)
    }
  },
  // 通知主进程测试模式开关（开启后主进程转发按键事件并注册 PrintScreen 全局快捷键）
  setTestMode(active: boolean){
    return ipcRenderer.send('test-mode', active)
  },
  // 后台记录开关：开启后主进程安装系统级键盘钩子，窗口不在前台也持续转发按键事件
  // 返回是否成功开启（钩子安装失败时返回 false）
  setBackgroundRecording(active: boolean){
    return ipcRenderer.invoke('set-background-recording', active)
  },
  // 读取某记录的累计按键次数（无记录返回 null）
  getKeyStats(recordId: string){
    return ipcRenderer.invoke('get-key-stats', recordId)
  },
  // 将本次会话的按下次数累加到该记录并保存，返回合并后的累计次数
  saveKeyStats(recordId: string, recordName: string, counts: Record<string, number>){
    return ipcRenderer.invoke('save-key-stats', { recordId, recordName, counts })
  },
  getConfig(){
    return ipcRenderer.invoke('get-config')
  },
  saveConfig(config: any){
    return ipcRenderer.invoke('save-config', config)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('__INITIAL_THEME__', initialTheme)
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.__INITIAL_THEME__ = initialTheme
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
