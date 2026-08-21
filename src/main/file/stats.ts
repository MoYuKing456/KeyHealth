import { getUserDataPath } from "../init/path"
import path from "path"
import fs from "fs"

/**
 * 按键次数统计文件结构（userData/stats/<recordId>.json）
 * - 每个键盘记录一份文件，按记录 id 命名；
 * - counts 为「累计按下次数」，随每次记录会话逐渐累加。
 */
export interface KeyPressStats {
  _type: "key-press-stats"
  _version: string
  recordId: string
  recordName: string
  createdAt: string
  updatedAt: string
  counts: Record<string, number>
}

// 统计目录：userData/stats
function getStatsDir(): string {
  return path.join(getUserDataPath(), "stats")
}

function getStatsFilePath(recordId: string): string {
  return path.join(getStatsDir(), `${recordId}.json`)
}

/** 校验是否为合法的统计文件结构 */
function isValidStatsFile(data: unknown): data is KeyPressStats {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    d._type === 'key-press-stats' &&
    typeof d.recordId === 'string' &&
    !!d.counts &&
    typeof d.counts === 'object' &&
    !Array.isArray(d.counts)
  )
}

/**
 * 读取某记录的累计按键次数；不存在或格式异常返回 null。
 */
export function getKeyStats(recordId: string): Record<string, number> | null {
  if (!recordId) return null
  const filePath = getStatsFilePath(recordId)
  if (!fs.existsSync(filePath)) return null

  try {
    const content = fs.readFileSync(filePath, "utf-8")
    const data = JSON.parse(content)
    if (isValidStatsFile(data)) {
      return { ...data.counts }
    }
    console.warn(`[按键统计] 统计文件格式异常: ${filePath}`)
  } catch (err) {
    console.warn(`[按键统计] 读取失败: ${filePath}`, err)
  }
  return null
}

/**
 * 将本次会话的按下次数累加到该记录的累计次数中并写回文件。
 * 返回合并后的累计次数（用于前端即时刷新）。
 */
export function saveKeyStats(
  recordId: string,
  recordName: string,
  counts: Record<string, number>
): Record<string, number> {
  if (!recordId) return {}

  const dir = getStatsDir()
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (err) {
    console.error("[按键统计] 创建统计目录失败", err)
    return {}
  }

  const filePath = getStatsFilePath(recordId)
  const existing = getKeyStats(recordId) || {}
  const createdAt =
    (() => {
      try {
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
          if (isValidStatsFile(data)) return data.createdAt
        }
      } catch {
        /* 忽略 */
      }
      return new Date().toISOString()
    })()

  // 累加本次会话次数
  for (const [code, n] of Object.entries(counts)) {
    if (n > 0) existing[code] = (existing[code] || 0) + n
  }

  const stats: KeyPressStats = {
    _type: "key-press-stats",
    _version: "1.0.0",
    recordId,
    recordName,
    createdAt,
    updatedAt: new Date().toISOString(),
    counts: existing
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(stats, null, 2), "utf-8")
    console.log(`[按键统计] 已保存: ${filePath} (共 ${Object.keys(existing).length} 键)`)
  } catch (err) {
    console.error(`[按键统计] 写入失败: ${filePath}`, err)
  }

  return { ...existing }
}

/**
 * 删除某记录的累计统计文件（记录被删除时清理）。
 */
export function deleteKeyStats(recordId: string): void {
  if (!recordId) return
  const filePath = getStatsFilePath(recordId)
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`[按键统计] 已删除统计: ${filePath}`)
    }
  } catch (err) {
    console.warn(`[按键统计] 删除失败: ${filePath}`, err)
  }
}
