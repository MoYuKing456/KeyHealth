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
 * 额外检查改键一致性：若改键后的功能在目标布局中已作为普通键位存在，会产生「两个按键发送同一功能」，
 * 该布局同样不可选择。
 * 返回值为空字符串表示该布局可用。
 */
export function getDisabledLayoutReasons(
  keys: Record<string, KeyHealth>,
  remap?: Record<string, string>
): Partial<Record<KeyboardLayoutType, string>> {
  const reasons: Partial<Record<KeyboardLayoutType, string>> = {}
  const dataCodes = Object.keys(keys).filter(code => keys[code] && keys[code].status !== KeyStatus.HEALTHY)
  if (dataCodes.length > 0) {
    for (const type of (['104', '98', '87'] as KeyboardLayoutType[])) {
      const layoutCodes = new Set(getLayoutKeyCodes(getKeyboardLayout(type)))
      const missing = dataCodes.filter(code => !layoutCodes.has(code))
      if (missing.length > 0) {
        reasons[type] = `该布局不包含 ${missing.length} 个已有数据的键位（如 ${missing[0]}）`
      }
    }
  }

  // 改键一致性：目标布局若已包含某改键后的功能（且该功能不是改键来源本身），会变成重复按键
  if (remap) {
    const sources = new Set(Object.keys(remap))
    for (const type of (['104', '98', '87'] as KeyboardLayoutType[])) {
      if (reasons[type]) continue
      const layoutCodes = new Set(getLayoutKeyCodes(getKeyboardLayout(type)))
      for (const [, target] of Object.entries(remap)) {
        // 目标功能是目标布局的普通键位、且该键位不是被改键的来源 → 重复
        if (layoutCodes.has(target) && !sources.has(target)) {
          reasons[type] = `该布局已包含「${getKeyFunctionLabel(target)}」键，与修改后的按键重复`
          break
        }
      }
    }
  }

  return reasons
}

// ---------------------------------------------------------------------------
// 按键功能修改（改键）辅助
// ---------------------------------------------------------------------------

/**
 * 所有可映射的按键功能代码（含布局内键位 + 布局外常见键位）。
 * 改键的目标功能从这些候选中选择；已被当前键盘使用的功能会自动排除。
 */
export const ALL_KEY_FUNCTIONS: { code: string; label: string }[] = [
  // 功能键行
  { code: 'Escape', label: 'Esc' },
  ...Array.from({ length: 24 }, (_, i) => ({ code: `F${i + 1}`, label: `F${i + 1}` })),
  // 数字行 + 主键盘区
  { code: 'Backquote', label: '`' },
  ...Array.from({ length: 10 }, (_, i) => ({ code: `Digit${(i + 1) % 10}`, label: `${(i + 1) % 10}` })),
  { code: 'Minus', label: '-' },
  { code: 'Equal', label: '=' },
  { code: 'Backspace', label: 'Backspace' },
  { code: 'Tab', label: 'Tab' },
  ...'QWERTYUIOP'.split('').map(c => ({ code: `Key${c}`, label: c })),
  { code: 'BracketLeft', label: '[' },
  { code: 'BracketRight', label: ']' },
  { code: 'Backslash', label: '\\' },
  { code: 'CapsLock', label: 'Caps Lock' },
  ...'ASDFGHJKL'.split('').map(c => ({ code: `Key${c}`, label: c })),
  { code: 'Semicolon', label: ';' },
  { code: 'Quote', label: "'" },
  { code: 'Enter', label: 'Enter' },
  { code: 'ShiftLeft', label: 'Shift L' },
  ...'ZXCVBNM'.split('').map(c => ({ code: `Key${c}`, label: c })),
  { code: 'Comma', label: ',' },
  { code: 'Period', label: '.' },
  { code: 'Slash', label: '/' },
  { code: 'ShiftRight', label: 'Shift R' },
  { code: 'ControlLeft', label: 'Ctrl L' },
  { code: 'MetaLeft', label: 'Win L' },
  { code: 'AltLeft', label: 'Alt L' },
  { code: 'Space', label: 'Space' },
  { code: 'AltRight', label: 'Alt R' },
  { code: 'MetaRight', label: 'Win R' },
  { code: 'ContextMenu', label: 'Menu' },
  { code: 'ControlRight', label: 'Ctrl R' },
  // 导航区
  { code: 'PrintScreen', label: 'PrtSc' },
  { code: 'ScrollLock', label: 'ScrLk' },
  { code: 'Pause', label: 'Pause' },
  { code: 'Insert', label: 'Insert' },
  { code: 'Home', label: 'Home' },
  { code: 'PageUp', label: 'PgUp' },
  { code: 'Delete', label: 'Del' },
  { code: 'End', label: 'End' },
  { code: 'PageDown', label: 'PgDn' },
  { code: 'ArrowUp', label: '↑' },
  { code: 'ArrowLeft', label: '←' },
  { code: 'ArrowDown', label: '↓' },
  { code: 'ArrowRight', label: '→' },
  // 数字小键盘
  { code: 'NumLock', label: 'Num' },
  { code: 'NumpadDivide', label: 'Num /' },
  { code: 'NumpadMultiply', label: 'Num *' },
  { code: 'NumpadSubtract', label: 'Num -' },
  { code: 'Numpad7', label: 'Num 7' },
  { code: 'Numpad8', label: 'Num 8' },
  { code: 'Numpad9', label: 'Num 9' },
  { code: 'NumpadAdd', label: 'Num +' },
  { code: 'Numpad4', label: 'Num 4' },
  { code: 'Numpad5', label: 'Num 5' },
  { code: 'Numpad6', label: 'Num 6' },
  { code: 'Numpad1', label: 'Num 1' },
  { code: 'Numpad2', label: 'Num 2' },
  { code: 'Numpad3', label: 'Num 3' },
  { code: 'Numpad0', label: 'Num 0' },
  { code: 'NumpadDecimal', label: 'Num .' },
  { code: 'NumpadEnter', label: 'Num Enter' }
]

const ALL_KEY_FUNCTION_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ALL_KEY_FUNCTIONS.map(f => [f.code, f.label])
)

/** 获取某功能代码的显示标签（不在候选中时原样返回） */
export function getKeyFunctionLabel(code: string): string {
  return ALL_KEY_FUNCTION_LABEL_MAP[code] || code
}

/** 构建全部功能代码 → 标签 查找表（KeyButton 显示改键后的功能名用） */
export function buildAllKeyFunctionLabelMap(): Record<string, string> {
  return { ...ALL_KEY_FUNCTION_LABEL_MAP }
}

/**
 * 计算某布局 + 改键配置下「当前已被使用的功能代码」集合。
 * 规则：普通键位使用其布局 code；被改键的来源键位不再发送原 code，改为发送目标功能。
 * used = (布局全部 code − 改键来源) ∪ 改键目标
 */
export function getUsedFunctionCodes(
  layout: KeyboardLayout,
  remap?: Record<string, string>
): Set<string> {
  const used = new Set(getLayoutKeyCodes(layout))
  if (!remap) return used
  for (const source of Object.keys(remap)) {
    used.delete(source)
  }
  for (const target of Object.values(remap)) {
    used.add(target)
  }
  return used
}

/**
 * 可选的改键目标功能：所有候选功能中「当前未被使用」的（避免出现两个按键发送同一功能）。
 */
export function getRemapTargetOptions(
  layout: KeyboardLayout,
  remap?: Record<string, string>
): { code: string; label: string }[] {
  const used = getUsedFunctionCodes(layout, remap)
  return ALL_KEY_FUNCTIONS.filter(f => !used.has(f.code))
}

/**
 * 校验一次改键操作。返回错误提示，null 表示合法。
 * - 来源必须是布局内的物理键位；
 * - 同一键位只能改一次；
 * - 不能改为自身的功能；
 * - 目标功能不能被当前键盘的其他键位使用（不允许两个按键发送同一功能）。
 */
export function validateRemap(
  layout: KeyboardLayout,
  remap: Record<string, string> | undefined,
  source: string,
  target: string
): string | null {
  if (!source) return '请选择要修改的源按键'
  if (!target) return '请选择目标功能'
  if (source === target) return '不能把按键修改为它自己的功能'

  const layoutCodes = new Set(getLayoutKeyCodes(layout))
  if (!layoutCodes.has(source)) return '源按键不在当前键盘布局中'

  if (remap && Object.prototype.hasOwnProperty.call(remap, source)) {
    return '该按键已被修改，请先在下方移除原有修改'
  }

  const used = getUsedFunctionCodes(layout, remap)
  if (used.has(target)) {
    return `「${getKeyFunctionLabel(target)}」已被其他按键使用，不能重复`
  }

  return null
}

/**
 * 测试/后台记录时的键位解析：把收到的功能 code 反向映射回物理键位 code。
 * 例：改键 { Delete: 'PrintScreen' }，收到 'PrintScreen' → 解析为 'Delete'。
 * 找不到映射时原样返回。
 */
export function resolveRemappedCode(
  remap: Record<string, string> | undefined,
  incomingCode: string
): string {
  if (!remap) return incomingCode
  for (const [position, func] of Object.entries(remap)) {
    if (func === incomingCode) return position
  }
  return incomingCode
}
