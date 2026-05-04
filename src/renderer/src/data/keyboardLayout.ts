import type { KeyboardLayout } from '../types'

// 104键标准键盘布局
export const keyboardLayout: KeyboardLayout = {
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
