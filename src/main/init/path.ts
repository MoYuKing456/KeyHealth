import path from "path";
import { app } from "electron";

// 获取用户数据路径
export function getUserDataPath(): string {
  if (app.isPackaged) {
        // 生产环境：使用可执行文件所在目录
        return path.join(path.dirname(app.getPath('exe')), 'userData');
    }
    // 开发环境：使用应用根目录
    return path.join(app.getAppPath(), 'userData');
}