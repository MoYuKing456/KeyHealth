import { getUserDataPath } from "../init/path"
import path from "path"
import fs from "fs"
import { isValidKeyboardHealthFile, isLegacyKeyHealth, migrateKeyHealth } from "../validator/jsonValidator"
import type { KeyboardHealthRecord, KeyboardHealthFile } from "../validator/jsonValidator"

/**
 * 检测已迁移但 history 为空的不完整数据（上次漏洞迁移的残留）
 */
function hasEmptyHistory(keyHealth: any): boolean {
  return (
    keyHealth &&
    Array.isArray(keyHealth.history) &&
    keyHealth.history.length === 0 &&
    keyHealth.status !== 'healthy'
  )
}

export function getUserData(): KeyboardHealthRecord[] {
  const userDataPath = getUserDataPath()

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  let files: string[] = []

  try {
    files = fs.readdirSync(userDataPath)
  } catch (err) {
    console.warn(`[读取目录失败] ${userDataPath}`, err)
    return []
  }

  const jsonFiles = files
    .filter(file => file.endsWith(".json"))
    .map(file => path.join(userDataPath, file))

  const result: KeyboardHealthRecord[] = []

  for (const filePath of jsonFiles) {
    let needsRewrite = false

    try {
      const content = fs.readFileSync(filePath, "utf-8")
      const data = JSON.parse(content)

      if (!isValidKeyboardHealthFile(data)) {
        console.warn(`[无效数据结构] ${filePath}`)
        continue
      }

      // 迁移旧格式 KeyHealth → 新格式（含 history 数组）
      for (const [keyCode, keyHealth] of Object.entries(data.userData.keys)) {
        if (isLegacyKeyHealth(keyHealth)) {
          console.log(`[数据迁移] 按键 ${keyCode} 从旧格式迁移到新格式`)
          data.userData.keys[keyCode] = migrateKeyHealth(keyHealth)
          needsRewrite = true
        } else if (hasEmptyHistory(keyHealth)) {
          // 修复上次漏洞迁移导致的空 history（原始日期已丢失，使用当前时间）
          console.log(`[数据修复] 按键 ${keyCode} history 为空，补充默认记录`)
          data.userData.keys[keyCode] = migrateKeyHealth({
            keyCode: keyHealth.keyCode,
            status: keyHealth.status,
            damagedAt: data.userData.updatedAt,
            replacedAt: keyHealth.status === 'replaced' ? data.userData.updatedAt : undefined
          })
          needsRewrite = true
        }
      }

      // 升级版本号
      if (data._version === "1.0.0") {
        data._version = "2.0.0"
        needsRewrite = true
      }

      // 写回迁移后的数据
      if (needsRewrite) {
        try {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
          console.log(`[迁移完成] ${filePath}`)
        } catch (err) {
          console.warn(`[迁移写入失败] ${filePath}`, err)
        }
      }

      result.push(data.userData)
    } catch (err) {
      console.warn(`[读取或解析失败] ${filePath}`, err)
    }
  }

  return result
}

export function createRecord(record: KeyboardHealthRecord) : void {
  const userDataPath = getUserDataPath()

  // 1. 构造完整文件结构
  const fileData: KeyboardHealthFile = {
    _type: "keyboard-health-record",
    _version: "2.0.0",
    userData: record
  }

  // 2. 处理文件名（防止非法字符）
  const safeFileName = record.name.replace(/[<>:"/\\|?*]/g, "_")

  const filePath = path.join(userDataPath, `${safeFileName}.json`)

  try {
    // 3. 防止覆盖（可选策略）
    if (fs.existsSync(filePath)) {
      console.warn(`[文件已存在] ${filePath}`)
      return
    }

    // 4. 写入文件
    fs.writeFileSync(
      filePath,
      JSON.stringify(fileData, null, 2),
      "utf-8"
    )

    console.log(`[创建成功] ${filePath}`)
  } catch (err) {
    console.error(`[创建失败] ${filePath}`, err)
  }
}

export function updateRecord(record: KeyboardHealthRecord): void {
  const userDataPath = getUserDataPath()

  const files = fs.readdirSync(userDataPath)

  const jsonFiles = files
    .filter(file => file.endsWith(".json"))
    .map(file => path.join(userDataPath, file))

  let found = false

  for (const filePath of jsonFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf-8")
      const data: KeyboardHealthFile = JSON.parse(content)

      if (!isValidKeyboardHealthFile(data)) continue

      // ⭐ 核心匹配：用 id
      if (data.userData.id === record.id) {
        found = true

        // 更新数据
        data.userData = record

        // 写回文件
        fs.writeFileSync(
          filePath,
          JSON.stringify(data, null, 2),
          "utf-8"
        )

        console.log(`[更新成功] ${filePath}`)
        break
      }
    } catch (err) {
      console.warn(`[更新失败] ${filePath}`, err)
    }
  }

  if (!found) {
    console.warn(`[未找到记录] id=${record.id}`)
  }
}