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
