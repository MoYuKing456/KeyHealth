import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getUserData, createRecord, updateRecord, deleteRecord } from './file/io'
import { loadConfig, saveConfig } from './file/config'

// 测试模式状态（由渲染进程通过 IPC 控制）：开启后主进程把按键事件转发给渲染进程用于可视化
let testModeActive = false

/**
 * PrintScreen 在 Windows 上不会触发 before-input-event（也不产生 DOM keydown），
 * 只能改用系统级全局快捷键捕获。注册期间按 PrintScreen 会被本应用截获（不会触发系统截图）。
 * 全局快捷键只有按下回调，抬起用短延时模拟，保证按键可视化能恢复。
 */
function registerPrintScreenShortcut(win: BrowserWindow | null): void {
  if (!win) return
  const ok = globalShortcut.register('PrintScreen', () => {
    if (!testModeActive) return
    if (!win.isFocused()) return
    win.webContents.send('raw-key-event', { type: 'keydown', code: 'PrintScreen', repeat: false })
    setTimeout(() => {
      if (testModeActive) {
        win.webContents.send('raw-key-event', { type: 'keyup', code: 'PrintScreen' })
      }
    }, 120)
  })
  if (!ok) {
    console.warn('[PrintScreen 全局快捷键注册失败]')
  }
}


function createWindow(): void {
  // 预读配置，获取主题（用于消除启动闪屏）
  const config = loadConfig()
  const isDark = config.theme === 'dark'

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: isDark ? '#0a0a0c' : '#f5f5f7',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      additionalArguments: [`--app-theme=${config.theme}`]
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 测试模式：把按键事件转发给渲染进程用于可视化（不 preventDefault，保证 keyup 正常送达）。
  // 在原生层（before-input-event）触发、发生在渲染进程 IME 之前，code 来自硬件扫描码，
  // 可避免中文输入法等在 DOM 层吞掉 Shift 等修饰键；右 Shift/Num Enter 天然准确。
  // PrintScreen 不触发此事件，由 registerPrintScreenShortcut 的全局快捷键单独处理。
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (!testModeActive) return
    if (input.code === 'PrintScreen') return
    const type = input.type === 'keyDown' ? 'keydown' : input.type === 'keyUp' ? 'keyup' : null
    if (!type) return
    mainWindow.webContents.send('raw-key-event', {
      type,
      code: input.code,
      repeat: input.isAutoRepeat
    })
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 获取用户数据的 IPC 处理器
  ipcMain.handle('get-user-data',()=>{
    return getUserData()
  })

  // 创建记录的 IPC 处理器
  ipcMain.handle('create-record', (_event, data) => {
    return createRecord(data)
  })

  ipcMain.handle('update-record', (_event, data) => {
    return updateRecord(data)
  })

  // 删除记录的 IPC 处理器
  ipcMain.handle('delete-record', (_event, id: string) => {
    return deleteRecord(id)
  })

  // 测试模式开关：开启后主进程转发按键，并注册/注销 PrintScreen 全局快捷键
  ipcMain.on('test-mode', (event, active: boolean) => {
    testModeActive = !!active
    const win = BrowserWindow.fromWebContents(event.sender)
    if (testModeActive) {
      registerPrintScreenShortcut(win)
    } else {
      globalShortcut.unregister('PrintScreen')
    }
  })

  // 配置相关的 IPC 处理器
  ipcMain.handle('get-config', () => {
    return loadConfig()
  })

  ipcMain.handle('save-config', (_event, config) => {
    return saveConfig(config)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // 清理测试模式的 PrintScreen 全局快捷键
  globalShortcut.unregister('PrintScreen')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
