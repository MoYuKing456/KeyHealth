import { getUserDataPath } from "../init/path"
import path from "path"
import fs from "fs"
import { isValidKeyboardHealthFile } from "../validator/jsonValidator"
import type { KeyboardHealthRecord } from "../validator/jsonValidator"

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