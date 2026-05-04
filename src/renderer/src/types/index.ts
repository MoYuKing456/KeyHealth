// 按键状态枚举
export enum KeyStatus {
  HEALTHY = 'healthy',
  DAMAGED = 'damaged',
  REPLACED = 'replaced'
}

// 单个按键的健康信息
export interface KeyHealth {
  keyCode: string
  status: KeyStatus
  damagedAt?: string  // ISO 日期字符串
  replacedAt?: string // ISO 日期字符串
}

// 键盘健康记录表
export interface KeyboardHealthRecord {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  keys: Record<string, KeyHealth>
}

// 键盘按键定义
export interface KeyDefinition {
  code: string
  label: string
  width?: number   // 相对宽度，默认为 1
  height?: number  // 相对高度，默认为 1（用于小键盘的竖向按键）
}

// 键盘行定义
export interface KeyboardRow {
  keys: KeyDefinition[]
}

// 功能键行（分组）
export interface FunctionRow {
  escape: KeyDefinition[]
  f1_f4: KeyDefinition[]
  f5_f8: KeyDefinition[]
  f9_f12: KeyDefinition[]
}

// 方向键
export interface ArrowKeys {
  up: KeyDefinition
  left: KeyDefinition
  down: KeyDefinition
  right: KeyDefinition
}

// 数字小键盘区域
export interface NumpadArea {
  row1: KeyDefinition[]  // 7-8-9
  row2: KeyDefinition[]  // 4-5-6
  plus: KeyDefinition    // + 竖向
  row3: KeyDefinition[]  // 1-2-3
  row4: KeyDefinition[]  // 0 和 .
  enter: KeyDefinition   // Enter 竖向
}

// 完整键盘布局
export interface KeyboardLayout {
  functionRow: FunctionRow
  mainArea: KeyboardRow[]
  navigationFunctionRow: KeyDefinition[]
  navigationArea: KeyboardRow[]
  arrowKeys: ArrowKeys
  numpadFunctionRow: KeyDefinition[]
  numpadArea: NumpadArea
}
