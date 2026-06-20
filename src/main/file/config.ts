import { getAppConfigPath } from "../init/path"
import path from "path"
import fs from "fs"

// 应用配置数据结构
export interface AppConfig {
  _type: "app-config"
  _version: string
  theme: "light" | "dark"
}

// 默认配置（亮色主题）
const DEFAULT_CONFIG: AppConfig = {
  _type: "app-config",
  _version: "1.0.0",
  theme: "light"
}

// 配置文件路径
function getConfigPath(): string {
  return getAppConfigPath()
}

/**
 * 读取应用配置，文件不存在时自动创建默认配置
 */
export function loadConfig(): AppConfig {
  const configPath = getConfigPath()
  const configDir = path.dirname(configPath)

  // 确保目录存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  // 文件不存在 → 创建默认配置
  if (!fs.existsSync(configPath)) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8")
      console.log("[配置] 已创建默认配置文件")
    } catch (err) {
      console.error("[配置] 创建默认配置失败", err)
    }
    return { ...DEFAULT_CONFIG }
  }

  // 读取并校验
  try {
    const content = fs.readFileSync(configPath, "utf-8")
    const data = JSON.parse(content)

    if (
      data &&
      data._type === "app-config" &&
      typeof data._version === "string" &&
      (data.theme === "light" || data.theme === "dark")
    ) {
      return data as AppConfig
    }

    console.warn("[配置] 配置文件格式异常，使用默认配置")
  } catch (err) {
    console.error("[配置] 读取配置文件失败", err)
  }

  // 异常时写回默认配置
  try {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8")
  } catch (_) { /* 忽略写回失败 */ }

  return { ...DEFAULT_CONFIG }
}

/**
 * 保存应用配置
 */
export function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath()

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8")
    console.log("[配置] 保存成功")
  } catch (err) {
    console.error("[配置] 保存失败", err)
  }
}
