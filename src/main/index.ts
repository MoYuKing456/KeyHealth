import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getUserData, createRecord, updateRecord, deleteRecord } from './file/io'
import { loadConfig, saveConfig } from './file/config'
import { getKeyStats, saveKeyStats, deleteKeyStats } from './file/stats'
import { subscribeKeys, unsubscribeKeys, type RawKeyEvent } from './hook/backgroundHook'

// 测试模式状态（由渲染进程通过 IPC 控制）：开启后主进程把按键事件转发给渲染进程用于可视化
let testModeActive = false

// 后台记录状态：开启后通过系统级键盘钩子捕获按键，即使窗口不在前台也持续记录
let backgroundRecordingActive = false
// 后台记录对应的全键订阅 id（uiohook）
let backgroundRecordingSubscription: number | null = null
// 测试模式下单独监听 PrintScreen 的订阅 id（后台记录开启时由全键钩子统一转发，无需单独订阅）
let printScreenTestSubscription: number | null = null

/**
 * 切换后台记录：开启时安装全局按键钩子并把事件转发给渲染进程；
 * 关闭时卸载钩子。返回是否成功开启（钩子安装失败时返回 false）。
 */
function setBackgroundRecording(win: BrowserWindow, active: boolean): boolean {
  backgroundRecordingActive = !!active

  if (backgroundRecordingActive) {
    const listener = (data: RawKeyEvent): void => {
      if (!win.isDestroyed()) {
        win.webContents.send('raw-key-event', data)
      }
    }
    const id = subscribeKeys(listener)
    if (id === -1) {
      backgroundRecordingActive = false
      return false
    }
    backgroundRecordingSubscription = id
  } else if (backgroundRecordingSubscription !== null) {
    unsubscribeKeys(backgroundRecordingSubscription)
    backgroundRecordingSubscription = null
  }

  // 后台记录状态变化会影响 PrintScreen 的检测方式，同步刷新订阅
  updatePrintScreenTestHook(win)
  return true
}

/**
 * PrintScreen 在 Windows 上不会触发 before-input-event（也不产生 DOM keydown），
 * 只能靠系统级键盘钩子捕获。这里使用非消费式的 uiohook 低级钩子（默认 CallNextHookEx 放行），
 * 因此既能检测到 PrtSc 按压，又不会拦截 Windows 原生截图（复制屏幕到剪贴板）。
 *
 * 注意：不能改用 globalShortcut/RegisterHotKey —— 全局快捷键会把 PrintScreen 截获吞掉，
 * 导致测试模式下原生截图功能失效（这正是非测试模式正常、测试模式失灵的原因）。
 *
 * 仅在「测试模式开启且后台记录关闭」时单独订阅 PrintScreen（后台记录开启时全键钩子已覆盖，
 * 避免同一按键被转发两次）。uiohook 能提供真实的 keyup，无需像全局快捷键那样延时模拟抬起。
 */
function updatePrintScreenTestHook(win: BrowserWindow | null): void {
  if (printScreenTestSubscription !== null) {
    unsubscribeKeys(printScreenTestSubscription)
    printScreenTestSubscription = null
  }
  if (!testModeActive || backgroundRecordingActive || !win) return
  printScreenTestSubscription = subscribeKeys(
    (data) => {
      // 与 before-input-event 通道一致：仅在窗口聚焦时可视化
      if (win.isDestroyed() || !win.isFocused()) return
      win.webContents.send('raw-key-event', data)
    },
    (code) => code === 'PrintScreen'
  )
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
  // PrintScreen 不触发此事件，由 updatePrintScreenTestHook 的非消费式低级钩子单独处理（不拦截原生截图）。
  // 后台记录开启时由系统级键盘钩子（uiohook）作为单一数据源，这里不再转发，避免重复计数。
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (!testModeActive || backgroundRecordingActive) return
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

  // 删除记录的 IPC 处理器（同时清理该记录的按键统计）
  ipcMain.handle('delete-record', (_event, id: string) => {
    const ok = deleteRecord(id)
    if (ok) deleteKeyStats(id)
    return ok
  })

  // 后台记录开关：开启后主进程安装全局键盘钩子，窗口不在前台也持续转发按键事件
  ipcMain.handle('set-background-recording', (event, active: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    return setBackgroundRecording(win, !!active)
  })

  // 按键统计相关 IPC 处理器
  ipcMain.handle('get-key-stats', (_event, recordId: string) => {
    return getKeyStats(recordId)
  })

  ipcMain.handle('save-key-stats', (_event, payload: { recordId: string; recordName: string; counts: Record<string, number> }) => {
    return saveKeyStats(payload.recordId, payload.recordName, payload.counts)
  })

  // 测试模式开关：开启后主进程转发按键，并按需订阅/注销 PrintScreen（非消费式低级钩子）
  ipcMain.on('test-mode', (event, active: boolean) => {
    testModeActive = !!active
    const win = BrowserWindow.fromWebContents(event.sender)
    updatePrintScreenTestHook(win)
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
  // 清理测试模式对 PrintScreen 的监听订阅
  if (printScreenTestSubscription !== null) {
    unsubscribeKeys(printScreenTestSubscription)
    printScreenTestSubscription = null
  }
  // 清理后台记录的全局键盘钩子
  if (backgroundRecordingSubscription !== null) {
    unsubscribeKeys(backgroundRecordingSubscription)
    backgroundRecordingSubscription = null
  }
  backgroundRecordingActive = false
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前兜底清理全局键盘钩子（unsubscribeKeys 会在最后一个订阅注销后自动停止底层钩子）
app.on('will-quit', () => {
  if (printScreenTestSubscription !== null) {
    unsubscribeKeys(printScreenTestSubscription)
    printScreenTestSubscription = null
  }
  if (backgroundRecordingSubscription !== null) {
    unsubscribeKeys(backgroundRecordingSubscription)
    backgroundRecordingSubscription = null
  }
  backgroundRecordingActive = false
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
