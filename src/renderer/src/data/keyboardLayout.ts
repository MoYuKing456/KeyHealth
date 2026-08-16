import { KeyStatus } from '../types'
import type { KeyboardLayout, KeyboardLayoutType, KeyDefinition, KeyHealth } from '../types'

// 104键标准键盘布局
const layout104: KeyboardLayout = {
  id: '104',
  name: '104 键',
  description: '全尺寸 · 含数字区',
  hasNumpad: true,
  showNavSection: true,
  // 主键盘区域 - 功能键行需要特殊分组处理
  functionRow: {
    escape: [
      { code: 'Escape', label: 'Esc', width: 1 },
    ],
    f1_f4: [
      { code: 'F1', label: 'F1', width: 1 },
      { code: 'F2', label: 'F2', width: 1 },
      { code: 'F3', label: 'F3', width: 1 },
      { code: 'F4', label: 'F4', width: 1 },
    ],
    f5_f8: [
      { code: 'F5', label: 'F5', width: 1 },
      { code: 'F6', label: 'F6', width: 1 },
      { code: 'F7', label: 'F7', width: 1 },
      { code: 'F8', label: 'F8', width: 1 },
    ],
    f9_f12: [
      { code: 'F9', label: 'F9', width: 1 },
      { code: 'F10', label: 'F10', width: 1 },
      { code: 'F11', label: 'F11', width: 1 },
      { code: 'F12', label: 'F12', width: 1 },
    ]
  },
  // 主键盘区域（不含功能键行）
  mainArea: [
    // 数字键行
    {
      keys: [
        { code: 'Backquote', label: '`', width: 1 },
        { code: 'Digit1', label: '1', width: 1 },
        { code: 'Digit2', label: '2', width: 1 },
        { code: 'Digit3', label: '3', width: 1 },
        { code: 'Digit4', label: '4', width: 1 },
        { code: 'Digit5', label: '5', width: 1 },
        { code: 'Digit6', label: '6', width: 1 },
        { code: 'Digit7', label: '7', width: 1 },
        { code: 'Digit8', label: '8', width: 1 },
        { code: 'Digit9', label: '9', width: 1 },
        { code: 'Digit0', label: '0', width: 1 },
        { code: 'Minus', label: '-', width: 1 },
        { code: 'Equal', label: '=', width: 1 },
        { code: 'Backspace', label: 'Backspace', width: 2 },
      ]
    },
    // Tab 行
    {
      keys: [
        { code: 'Tab', label: 'Tab', width: 1.5 },
        { code: 'KeyQ', label: 'Q', width: 1 },
        { code: 'KeyW', label: 'W', width: 1 },
        { code: 'KeyE', label: 'E', width: 1 },
        { code: 'KeyR', label: 'R', width: 1 },
        { code: 'KeyT', label: 'T', width: 1 },
        { code: 'KeyY', label: 'Y', width: 1 },
        { code: 'KeyU', label: 'U', width: 1 },
        { code: 'KeyI', label: 'I', width: 1 },
        { code: 'KeyO', label: 'O', width: 1 },
        { code: 'KeyP', label: 'P', width: 1 },
        { code: 'BracketLeft', label: '[', width: 1 },
        { code: 'BracketRight', label: ']', width: 1 },
        { code: 'Backslash', label: '\\', width: 1.5 },
      ]
    },
    // Caps Lock 行
    {
      keys: [
        { code: 'CapsLock', label: 'Caps Lock', width: 1.75 },
        { code: 'KeyA', label: 'A', width: 1 },
        { code: 'KeyS', label: 'S', width: 1 },
        { code: 'KeyD', label: 'D', width: 1 },
        { code: 'KeyF', label: 'F', width: 1 },
        { code: 'KeyG', label: 'G', width: 1 },
        { code: 'KeyH', label: 'H', width: 1 },
        { code: 'KeyJ', label: 'J', width: 1 },
        { code: 'KeyK', label: 'K', width: 1 },
        { code: 'KeyL', label: 'L', width: 1 },
        { code: 'Semicolon', label: ';', width: 1 },
        { code: 'Quote', label: "'", width: 1 },
        { code: 'Enter', label: 'Enter', width: 2.25 },
      ]
    },
    // Shift 行
    {
      keys: [
        { code: 'ShiftLeft', label: 'Shift', width: 2.25 },
        { code: 'KeyZ', label: 'Z', width: 1 },
        { code: 'KeyX', label: 'X', width: 1 },
        { code: 'KeyC', label: 'C', width: 1 },
        { code: 'KeyV', label: 'V', width: 1 },
        { code: 'KeyB', label: 'B', width: 1 },
        { code: 'KeyN', label: 'N', width: 1 },
        { code: 'KeyM', label: 'M', width: 1 },
        { code: 'Comma', label: ',', width: 1 },
        { code: 'Period', label: '.', width: 1 },
        { code: 'Slash', label: '/', width: 1 },
        { code: 'ShiftRight', label: 'Shift', width: 2.75 },
      ]
    },
    // 底部行
    {
      keys: [
        { code: 'ControlLeft', label: 'Ctrl', width: 1.25 },
        { code: 'MetaLeft', label: 'Win', width: 1.25 },
        { code: 'AltLeft', label: 'Alt', width: 1.25 },
        { code: 'Space', label: '', width: 6.25 },
        { code: 'AltRight', label: 'Alt', width: 1.25 },
        { code: 'MetaRight', label: 'Win', width: 1.25 },
        { code: 'ContextMenu', label: 'Menu', width: 1.25 },
        { code: 'ControlRight', label: 'Ctrl', width: 1.25 },
      ]
    }
  ],
  // 导航区域功能键行
  navigationFunctionRow: [
    { code: 'PrintScreen', label: 'PrtSc', width: 1 },
    { code: 'ScrollLock', label: 'ScrLk', width: 1 },
    { code: 'Pause', label: 'Pause', width: 1 },
  ],
  // 导航区域主体
  navigationArea: [
    // 插入删除行
    {
      keys: [
        { code: 'Insert', label: 'Insert', width: 1 },
        { code: 'Home', label: 'Home', width: 1 },
        { code: 'PageUp', label: 'PgUp', width: 1 },
      ]
    },
    // 删除行
    {
      keys: [
        { code: 'Delete', label: 'Delete', width: 1 },
        { code: 'End', label: 'End', width: 1 },
        { code: 'PageDown', label: 'PgDn', width: 1 },
      ]
    },
  ],
  // 方向键区域（单独处理布局）
  arrowKeys: {
    up: { code: 'ArrowUp', label: '↑', width: 1 },
    left: { code: 'ArrowLeft', label: '←', width: 1 },
    down: { code: 'ArrowDown', label: '↓', width: 1 },
    right: { code: 'ArrowRight', label: '→', width: 1 },
  },
  // 数字小键盘功能键行
  numpadFunctionRow: [
    { code: 'NumLock', label: 'Num', width: 1 },
    { code: 'NumpadDivide', label: '/', width: 1 },
    { code: 'NumpadMultiply', label: '*', width: 1 },
    { code: 'NumpadSubtract', label: '-', width: 1 },
  ],
  // 数字小键盘区域（需要特殊处理竖向按键）
  numpadArea: {
    // 7-8-9 行与 + 键
    row1: [
      { code: 'Numpad7', label: '7', width: 1 },
      { code: 'Numpad8', label: '8', width: 1 },
      { code: 'Numpad9', label: '9', width: 1 },
    ],
    // 4-5-6 行
    row2: [
      { code: 'Numpad4', label: '4', width: 1 },
      { code: 'Numpad5', label: '5', width: 1 },
      { code: 'Numpad6', label: '6', width: 1 },
    ],
    // + 键（竖向2格）
    plus: { code: 'NumpadAdd', label: '+', width: 1, height: 2 },
    // 1-2-3 行
    row3: [
      { code: 'Numpad1', label: '1', width: 1 },
      { code: 'Numpad2', label: '2', width: 1 },
      { code: 'Numpad3', label: '3', width: 1 },
    ],
    // 0 和 . 行
    row4: [
      { code: 'Numpad0', label: '0', width: 2 },
      { code: 'NumpadDecimal', label: '.', width: 1 },
    ],
    // Enter 键（竖向2格）
    enter: { code: 'NumpadEnter', label: 'Enter', width: 1, height: 2 },
  }
}

// 98键（市面标准 98 配列）：
// - Delete 位于 F12 右侧；无 PrtSc/ScrLk/Pause/Insert
// - Home/End/PgUp/PgDn 位于数字区正上方（与 F1-F12 同行）
// - 方向键嵌入数字区左下凹槽（↑ 在 Shift 行、←↓→ 在底部行，→ 位于数字 1 正下方）
// - 数字区与主键盘区几乎贴合；底部行无 Menu；右 Shift 收窄 1.75；数字区 0 键单宽
const layout98: KeyboardLayout = {
  id: '98',
  name: '98 键',
  description: '紧凑全尺寸 · 含数字区',
  hasNumpad: true,
  showNavSection: false,
  functionRow: {
    escape: layout104.functionRow.escape,
    f1_f4: layout104.functionRow.f1_f4,
    f5_f8: layout104.functionRow.f5_f8,
    // F9-F12 后追加 Delete（位于 F12 右侧）
    f9_f12: [
      ...layout104.functionRow.f9_f12,
      { code: 'Delete', label: 'Del', width: 1 },
    ],
  },
  mainArea: [
    // 数字行、Tab 行、Caps 行与 104 一致
    ...layout104.mainArea.slice(0, 3),
    // Shift 行：右 Shift 收窄为 2.5，为右上方的 ↑ 方向键让出位置（避免重叠）
    {
      keys: [
        { code: 'ShiftLeft', label: 'Shift', width: 2.25 },
        { code: 'KeyZ', label: 'Z', width: 1 },
        { code: 'KeyX', label: 'X', width: 1 },
        { code: 'KeyC', label: 'C', width: 1 },
        { code: 'KeyV', label: 'V', width: 1 },
        { code: 'KeyB', label: 'B', width: 1 },
        { code: 'KeyN', label: 'N', width: 1 },
        { code: 'KeyM', label: 'M', width: 1 },
        { code: 'Comma', label: ',', width: 1 },
        { code: 'Period', label: '.', width: 1 },
        { code: 'Slash', label: '/', width: 1 },
        { code: 'ShiftRight', label: 'Shift', width: 2.5 },
      ]
    },
    // 底部行：无 Menu 键（右侧仅 Alt Win Ctrl），为底部方向键让出空间
    {
      keys: [
        { code: 'ControlLeft', label: 'Ctrl', width: 1.25 },
        { code: 'MetaLeft', label: 'Win', width: 1.25 },
        { code: 'AltLeft', label: 'Alt', width: 1.25 },
        { code: 'Space', label: '', width: 6.25 },
        { code: 'AltRight', label: 'Alt', width: 1.25 },
        { code: 'MetaRight', label: 'Win', width: 1.25 },
        { code: 'ControlRight', label: 'Ctrl', width: 1.25 },
      ]
    }
  ],
  // 顶部导航键：渲染在数字区正上方（与 F1-F12 同行）
  navigationFunctionRow: [
    { code: 'Home', label: 'Home', width: 1 },
    { code: 'End', label: 'End', width: 1 },
    { code: 'PageUp', label: 'PgUp', width: 1 },
    { code: 'PageDown', label: 'PgDn', width: 1 },
  ],
  navigationArea: [],
  arrowKeys: layout104.arrowKeys,
  numpadFunctionRow: layout104.numpadFunctionRow,
  numpadArea: {
    ...layout104.numpadArea,
    // 数字区 0 键由双宽改为单宽
    row4: [
      { code: 'Numpad0', label: '0', width: 1 },
      { code: 'NumpadDecimal', label: '.', width: 1 },
    ],
  },
}

// 87键（无数字小键盘 / Tenkeyless）
const layout87: KeyboardLayout = {
  id: '87',
  name: '87 键',
  description: '无数字区 · TKL',
  hasNumpad: false,
  showNavSection: true,
  functionRow: layout104.functionRow,
  mainArea: layout104.mainArea,
  navigationFunctionRow: layout104.navigationFunctionRow,
  navigationArea: layout104.navigationArea,
  arrowKeys: layout104.arrowKeys,
  numpadFunctionRow: [],
  numpadArea: {
    row1: [],
    row2: [],
    row3: [],
    row4: [],
    plus: { code: 'NumpadAdd', label: '', width: 1, height: 2 },
    enter: { code: 'NumpadEnter', label: '', width: 1, height: 2 },
  },
}

// 所有布局的映射
export const keyboardLayouts: Record<KeyboardLayoutType, KeyboardLayout> = {
  '104': layout104,
  '98': layout98,
  '87': layout87,
}

// 兼容旧引用：104 布局
export const keyboardLayout = layout104

// 布局选项（用于创建记录 / 布局选择）
export const layoutOptions: { type: KeyboardLayoutType; name: string; description: string }[] = [
  { type: '104', name: '104 键', description: '全尺寸 · 含数字区' },
  { type: '98', name: '98 键', description: '紧凑全尺寸 · 含数字区' },
  { type: '87', name: '87 键', description: '无数字区 · TKL' },
]

/** 根据类型获取布局，未知类型回退到 104 */
export function getKeyboardLayout(type: KeyboardLayoutType): KeyboardLayout {
  return keyboardLayouts[type] || layout104
}

/** 收集布局中所有按键定义（无数字区的布局会跳过小键盘） */
export function collectLayoutKeys(layout: KeyboardLayout): KeyDefinition[] {
  const keys: KeyDefinition[] = []
  const push = (key?: KeyDefinition | null) => {
    if (key) keys.push(key)
  }
  layout.functionRow.escape.forEach(push)
  layout.functionRow.f1_f4.forEach(push)
  layout.functionRow.f5_f8.forEach(push)
  layout.functionRow.f9_f12.forEach(push)
  layout.mainArea.forEach(row => row.keys.forEach(push))
  // 导航键与方向键：104/87 渲染在独立导航区，98 渲染在数字区顶部/左下凹槽，均需收集
  layout.navigationFunctionRow.forEach(push)
  layout.navigationArea.forEach(row => row.keys.forEach(push))
  push(layout.arrowKeys.up)
  push(layout.arrowKeys.left)
  push(layout.arrowKeys.down)
  push(layout.arrowKeys.right)
  if (layout.hasNumpad) {
    layout.numpadFunctionRow.forEach(push)
    layout.numpadArea.row1.forEach(push)
    layout.numpadArea.row2.forEach(push)
    layout.numpadArea.row3.forEach(push)
    layout.numpadArea.row4.forEach(push)
    push(layout.numpadArea.plus)
    push(layout.numpadArea.enter)
  }
  return keys
}

/** 获取布局包含的全部键位 code */
export function getLayoutKeyCodes(layout: KeyboardLayout): string[] {
  return collectLayoutKeys(layout).map(k => k.code)
}

/** 布局的键位总数 */
export function countLayoutKeys(layout: KeyboardLayout): number {
  return getLayoutKeyCodes(layout).length
}

/** 构建 keyCode → label 查找表 */
export function buildKeyLabelMap(layout: KeyboardLayout): Record<string, string> {
  const map: Record<string, string> = {}
  for (const key of collectLayoutKeys(layout)) {
    map[key.code] = key.label
  }
  return map
}

/**
 * 根据按键数据计算各布局的禁用原因。
 * 若某个布局不包含一个已有数据的键位（如 87 布局不含小键盘），则该布局不可选择，
 * 避免切换布局后已有健康数据被隐藏/丢失。
 * 返回值为空字符串表示该布局可用。
 */
export function getDisabledLayoutReasons(
  keys: Record<string, KeyHealth>
): Partial<Record<KeyboardLayoutType, string>> {
  const reasons: Partial<Record<KeyboardLayoutType, string>> = {}
  const dataCodes = Object.keys(keys).filter(code => keys[code] && keys[code].status !== KeyStatus.HEALTHY)
  if (dataCodes.length === 0) return reasons

  for (const type of (['104', '98', '87'] as KeyboardLayoutType[])) {
    const layoutCodes = new Set(getLayoutKeyCodes(getKeyboardLayout(type)))
    const missing = dataCodes.filter(code => !layoutCodes.has(code))
    if (missing.length > 0) {
      reasons[type] = `该布局不包含 ${missing.length} 个已有数据的键位（如 ${missing[0]}）`
    }
  }
  return reasons
}
