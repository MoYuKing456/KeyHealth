export interface KeyboardHealthRecord {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  keys: Record<string, any>
}

export interface KeyboardHealthFile {
  _type: "keyboard-health-record"
  _version: string
  userData: KeyboardHealthRecord
}

// 第一层：文件识别
export function isKeyboardHealthFile(data: any): data is KeyboardHealthFile {
  return (
    data &&
    data._type === "keyboard-health-record" &&
    typeof data._version === "string" &&
    typeof data.userData === "object"
  )
}

// 第二层：数据结构校验
export function isKeyboardHealthRecord(data: any): data is KeyboardHealthRecord {
  return (
    data &&
    typeof data.id === "string" &&
    typeof data.name === "string" &&
    typeof data.createdAt === "string" &&
    typeof data.updatedAt === "string" &&
    typeof data.keys === "object"
  )
}

// 最终校验
export function isValidKeyboardHealthFile(data: any): data is KeyboardHealthFile {
  return (
    isKeyboardHealthFile(data) &&
    isKeyboardHealthRecord(data.userData)
  )
}