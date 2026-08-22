/**
 * 后台记录：通过 uiohook-napi 安装系统级键盘钩子（WH_KEYBOARD_LL 底层实现），
 * 即使 KeyHealth 窗口不在前台，也能捕获每个按键的按下/抬起，转发给渲染进程计数。
 *
 * uiohook-napi 的 keycode 是 PS/2 扫描码（与 DOM KeyboardEvent.code 同源），
 * 且能区分左右修饰键（Shift=42 / ShiftRight=54 等），因此可精确映射回 DOM code。
 *
 * 重要：uiohook 的低级钩子默认调用 CallNextHookEx 放行按键（非消费式），
 * 因此用它检测 PrintScreen 不会拦截 Windows 原生截图功能。这与
 * globalShortcut/RegisterHotKey 不同——全局快捷键会在系统层截获并吞掉按键。
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { uIOhook } = require('uiohook-napi')

export type RawKeyEvent = {
  type: 'keydown' | 'keyup'
  code: string
  repeat?: boolean
}

/**
 * uiohook 扫描码 → DOM KeyboardEvent.code 映射表。
 * 覆盖 104/98/87 布局全部键位（不含 Pause/ContextMenu，uiohook 不提供这两个键的扫描码）。
 */
const UIOHOOK_KEY_TO_CODE: Record<number, string> = {
  1: 'Escape',
  2: 'Digit1', 3: 'Digit2', 4: 'Digit3', 5: 'Digit4', 6: 'Digit5',
  7: 'Digit6', 8: 'Digit7', 9: 'Digit8', 10: 'Digit9', 11: 'Digit0',
  12: 'Minus', 13: 'Equal', 14: 'Backspace', 15: 'Tab',
  16: 'KeyQ', 17: 'KeyW', 18: 'KeyE', 19: 'KeyR', 20: 'KeyT',
  21: 'KeyY', 22: 'KeyU', 23: 'KeyI', 24: 'KeyO', 25: 'KeyP',
  26: 'BracketLeft', 27: 'BracketRight', 28: 'Enter', 29: 'ControlLeft',
  30: 'KeyA', 31: 'KeyS', 32: 'KeyD', 33: 'KeyF', 34: 'KeyG', 35: 'KeyH',
  36: 'KeyJ', 37: 'KeyK', 38: 'KeyL', 39: 'Semicolon', 40: 'Quote',
  41: 'Backquote', 42: 'ShiftLeft', 43: 'Backslash',
  44: 'KeyZ', 45: 'KeyX', 46: 'KeyC', 47: 'KeyV', 48: 'KeyB', 49: 'KeyN', 50: 'KeyM',
  51: 'Comma', 52: 'Period', 53: 'Slash', 54: 'ShiftRight',
  55: 'NumpadMultiply', 56: 'AltLeft', 57: 'Space', 58: 'CapsLock',
  59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5', 64: 'F6', 65: 'F7',
  66: 'F8', 67: 'F9', 68: 'F10', 69: 'NumLock', 70: 'ScrollLock',
  71: 'Numpad7', 72: 'Numpad8', 73: 'Numpad9', 74: 'NumpadSubtract',
  75: 'Numpad4', 76: 'Numpad5', 77: 'Numpad6', 78: 'NumpadAdd',
  79: 'Numpad1', 80: 'Numpad2', 81: 'Numpad3', 82: 'Numpad0', 83: 'NumpadDecimal',
  87: 'F11', 88: 'F12', 91: 'F13', 92: 'F14', 93: 'F15', 99: 'F16',
  100: 'F17', 101: 'F18', 102: 'F19', 103: 'F20', 104: 'F21', 105: 'F22',
  106: 'F23', 107: 'F24',
  3612: 'NumpadEnter', 3613: 'ControlRight', 3637: 'NumpadDivide',
  3639: 'PrintScreen', 3640: 'AltRight',
  3655: 'Home', 3657: 'PageUp', 3663: 'End', 3665: 'PageDown',
  3666: 'Insert', 3667: 'Delete', 3675: 'MetaLeft', 3676: 'MetaRight',
  57416: 'ArrowUp', 57419: 'ArrowLeft', 57421: 'ArrowRight', 57424: 'ArrowDown',
  // NumLock 关闭时数字区上报的扩展扫描码 → 归入对应数字键
  60999: 'Numpad7', 61000: 'Numpad8', 61001: 'Numpad9', 61003: 'Numpad4',
  61005: 'Numpad6', 61007: 'Numpad1', 61008: 'Numpad2', 61009: 'Numpad3',
  61010: 'Numpad0', 61011: 'NumpadDecimal'
}

export function mapUiohookKeycodeToCode(keycode: number): string | null {
  return UIOHOOK_KEY_TO_CODE[keycode] ?? null
}

// 钩子是否已安装
let hookStarted = false
// 订阅管理：多个订阅共享同一个 uiohook 实例，按需独立转发/过滤（引用计数决定何时启停底层钩子）
let nextSubscriptionId = 1
const subscriptions = new Map<
  number,
  { listener: (data: RawKeyEvent) => void; filter?: (code: string) => boolean }
>()

// 长按自动重复检测：记录每个键最近一次 keydown 的时间
const lastKeydownTime = new Map<string, number>()
// 自动重复间隔阈值（毫秒）：低于此间隔视为按住连发，不计为有效按压
const REPEAT_WINDOW_MS = 50

function dispatch(data: RawKeyEvent): void {
  for (const { listener, filter } of subscriptions.values()) {
    if (!filter || filter(data.code)) listener(data)
  }
}

function handleKeydown(e: { keycode: number }): void {
  const code = mapUiohookKeycodeToCode(e.keycode)
  if (!code) return
  const now = Date.now()
  const last = lastKeydownTime.get(code) || 0
  const repeat = now - last < REPEAT_WINDOW_MS
  lastKeydownTime.set(code, now)
  dispatch({ type: 'keydown', code, repeat })
}

function handleKeyup(e: { keycode: number }): void {
  const code = mapUiohookKeycodeToCode(e.keycode)
  if (!code) return
  dispatch({ type: 'keyup', code })
}

function ensureHookStarted(): boolean {
  if (hookStarted) return true

  try {
    uIOhook.on('keydown', handleKeydown)
    uIOhook.on('keyup', handleKeyup)
    uIOhook.start()
    hookStarted = true
    console.log('[后台记录] 全局按键钩子已启动')
    return true
  } catch (err) {
    console.error('[后台记录] 全局按键钩子启动失败', err)
    uIOhook.removeListener('keydown', handleKeydown)
    uIOhook.removeListener('keyup', handleKeyup)
    return false
  }
}

function ensureHookStopped(): void {
  if (subscriptions.size > 0 || !hookStarted) return

  try {
    uIOhook.stop()
  } catch (err) {
    console.warn('[后台记录] 停止钩子失败', err)
  }
  uIOhook.removeListener('keydown', handleKeydown)
  uIOhook.removeListener('keyup', handleKeyup)
  hookStarted = false
  lastKeydownTime.clear()
  console.log('[后台记录] 全局按键钩子已停止')
}

/**
 * 订阅全局按键事件。filter 返回 true 时才把该键转发给 listener（默认转发全部按键）。
 * 钩子启动失败时返回 -1，否则返回订阅 id（用于 unsubscribeKeys 注销）。
 */
export function subscribeKeys(
  listener: (data: RawKeyEvent) => void,
  filter?: (code: string) => boolean
): number {
  if (!ensureHookStarted()) return -1
  const id = nextSubscriptionId++
  subscriptions.set(id, { listener, filter })
  return id
}

/**
 * 注销按键订阅。最后一个订阅注销后会自动停止底层钩子。注销未订阅的 id 是安全的。
 */
export function unsubscribeKeys(id: number): void {
  if (subscriptions.delete(id)) {
    ensureHookStopped()
  }
}
