import { getUserDataPath } from "../init/path"
import path from "path"
import fs from "fs"
import { isValidKeyboardHealthFile } from "../validator/jsonValidator"
import type { KeyboardHealthRecord,KeyboardHealthFile } from "../validator/jsonValidator"

export function getUserData(): KeyboardHealthRecord[] {
  const userDataPath = getUserDataPath()

  const files = fs.readdirSync(userDataPath)

  const jsonFiles = files
    .filter(file => file.endsWith(".json"))
    .map(file => path.join(userDataPath, file))

  const result: KeyboardHealthRecord[] = []

  for (const filePath of jsonFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf-8")
      const data = JSON.parse(content)

      // 类型守卫校验
      if (isValidKeyboardHealthFile(data)) {
        result.push(data.userData)
      } else {
        console.warn(`[无效数据结构] ${filePath}`)
      }
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
    _version: "1.0.0",
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