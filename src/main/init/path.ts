import path from "path";
import { app } from "electron";

// 获取用户数据路径（键盘健康记录存放处）
export function getUserDataPath(): string {
  if (app.isPackaged) {
        // 生产环境：使用可执行文件所在目录
        return path.join(path.dirname(app.getPath('exe')), 'userData');
    }
    // 开发环境：使用应用根目录
    return path.join(app.getAppPath(), 'userData');
}

// 获取应用配置路径（与 userData 目录同级，开发在项目根目录，生产在 exe 同目录）
export function getAppConfigPath(): string {
  return path.join(path.dirname(getUserDataPath()), 'keyhealthconfig.json');
}