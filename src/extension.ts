import * as vscode from 'vscode';
import { RulesViewProvider } from './panels/RulesViewProvider';

/**
 * 扩展激活时调用的入口函数
 * @param context 扩展上下文，用于注册命令和管理资源
 */
export function activate(context: vscode.ExtensionContext) {
  // 注册打开规则查看器的命令
  let disposable = vscode.commands.registerCommand('cursor-rules.openViewer', () => {
    // 创建并显示规则面板
    RulesViewProvider.getInstance(context.extensionUri).show();
  });

  // 将命令添加到订阅列表中，确保正确释放资源
  context.subscriptions.push(disposable);
}

/**
 * 扩展停用时调用的清理函数
 */
export function deactivate() {}
