// 单次损坏事件
export interface DamageEvent {
  damagedAt: string
  damageType?: 'normal' | 'swap'
  replacedAt?: string
  replacementType?: 'normal' | 'swap'
  swapWithKeyCode?: string
}

export interface KeyboardHealthRecord {
  id: string
  name: string
  layout?: string
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

/**
 * 判断 KeyHealth 是否为旧格式（无 history 数组）
 * 旧格式: { keyCode, status, damagedAt?, replacedAt? }
 * 新格式: { keyCode, status, history: DamageEvent[] }
 */
export function isLegacyKeyHealth(data: any): boolean {
  return (
    data &&
    typeof data.keyCode === "string" &&
    typeof data.status === "string" &&
    !Array.isArray(data.history)
  )
}

/**
 * 将旧格式 KeyHealth 迁移为新格式
 */
export function migrateKeyHealth(legacy: any): { keyCode: string; status: string; history: DamageEvent[] } {
  const history: DamageEvent[] = []

  // 只要有损坏或更换记录，就创建历史条目
  if (legacy.damagedAt || legacy.replacedAt) {
    const event: DamageEvent = {
      // damagedAt 缺失时用 replacedAt 回退（旧数据可能只记录了更换时间）
      damagedAt: legacy.damagedAt || legacy.replacedAt,
      damageType: 'normal'
    }
    if (legacy.replacedAt) {
      event.replacedAt = legacy.replacedAt
      event.replacementType = 'normal'
    }
    history.push(event)
  }

  return {
    keyCode: legacy.keyCode,
    status: legacy.status,
    history
  }
}

/**
 * 为旧 history 记录补齐事件类型。缺失或非法类型都按旧版“普通操作”处理。
 * 返回是否产生修改，供调用方决定是否写回文件。
 */
export function normalizeKeyHealthEventTypes(keyHealth: any): boolean {
  if (!keyHealth || !Array.isArray(keyHealth.history)) return false

  let changed = false
  for (const event of keyHealth.history) {
    if (event.damageType !== 'normal' && event.damageType !== 'swap') {
      event.damageType = 'normal'
      changed = true
    }
    if (event.replacedAt && event.replacementType !== 'normal' && event.replacementType !== 'swap') {
      event.replacementType = 'normal'
      changed = true
    }
  }
  return changed
}
