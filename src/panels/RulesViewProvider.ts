import * as vscode from 'vscode';
import { getNonce } from '../utilities/getNonce';
import { getUri } from '../utilities/getUri';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

interface RuleAuthor {
  name: string;
  url: string;
  avatar: string | null;
}

interface Rule {
  title: string;
  slug: string;
  tags: string[];
  libs: string[];
  content: string;
  author: RuleAuthor;
}

export class RulesViewProvider {
  public static readonly viewType = 'cursor-rules.rulesView';
  private _panel?: vscode.WebviewPanel;
  private static _instance: RulesViewProvider;
  private static readonly RULES_URL = 'https://raw.githubusercontent.com/tigerlove/vscode-extension-cursordir/main/webview-ui/public/rules.json';
  private static readonly LAST_SYNC_KEY = 'cursorRules.lastSync';
  private static readonly RULES_CACHE_KEY = 'cursorRules.cachedRules';
  private static readonly RULES_JSON_PATH = path.join(__dirname, '..', 'webview-ui', 'build', 'rules.json');

  private constructor(private readonly _extensionUri: vscode.Uri) {
    console.log('RulesViewProvider constructor called');
  }

  public static getInstance(extensionUri: vscode.Uri): RulesViewProvider {
    console.log('Getting RulesViewProvider instance');
    if (!RulesViewProvider._instance) {
      RulesViewProvider._instance = new RulesViewProvider(extensionUri);
    }
    return RulesViewProvider._instance;
  }

  public show() {
    console.log('RulesViewProvider show method called');
    if (this._panel) {
      console.log('Existing panel found, revealing it');
      this._panel.reveal();
      return;
    }

    console.log('Creating new webview panel');
    this._panel = vscode.window.createWebviewPanel(
      RulesViewProvider.viewType,
      'Cursor Rules',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
        retainContextWhenHidden: true,
      }
    );

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(async (data) => {
      console.log('Received message from webview:', data);
      switch (data.type) {
        case 'getRules':
          console.log('Handling getRules message');
          await this._sendRules();
          break;
        case 'setRule':
          console.log('Handling setRule message:', data.rule);
          await this._setRule(data.rule);
          break;
        case 'syncRules':
          console.log('Handling syncRules message');
          await this._syncRules();
          break;
      }
    });

    this._panel.onDidDispose(() => {
      console.log('Webview panel disposed');
      this._panel = undefined;
    });

    // Initial load of rules
    console.log('Initiating initial rules load');
    this._sendRules();
  }

  private async _sendRules() {
    console.log('_sendRules called');
    if (!this._panel) {
      console.log('No panel available to send rules to');
      return;
    }

    const { rules, needsSync, isOffline } = await this._loadRules();
    const lastSync = await this._getLastSync();
    
    console.log('Sending rules to webview');
    this._panel.webview.postMessage({
      type: 'setRules',
      rules,
      lastSync,
      needsSync,
      isOffline
    });
  }

  private async _loadRules(): Promise<{ rules: Rule[]; needsSync: boolean; isOffline: boolean }> {
    console.log('Starting _loadRules function');
    let localRules: Rule[] = [];
    try {
      // Load local rules first as fallback
      console.log('Loading local rules');
      localRules = await this._loadLocalRules();
      console.log('Loaded local rules count:', localRules.length);

      if (localRules.length === 0) {
        console.log('No local rules found - this should not happen');
        vscode.window.showErrorMessage('No local rules found. Please reinstall the extension.');
        return { rules: [], needsSync: true, isOffline: true };
      }

      // Check online status by trying to fetch
      let isOffline = true;
      try {
        const response = await fetch(RulesViewProvider.RULES_URL, {
          method: 'HEAD',
          timeout: 50000 // 5 second timeout
        });
        isOffline = !response.ok;
      } catch (error) {
        console.log('Network check failed, assuming offline:', error);
        isOffline = true;
      }

      if (isOffline) {
        console.log('Offline mode - using local rules');
        return { rules: localRules, needsSync: true, isOffline: true };
      }

      // Online mode - check if sync needed
      const lastSync = await this._getLastSync();
      const needsSync = !lastSync || Date.now() - lastSync > 24 * 60 * 60 * 1000; // 24 hours
      console.log('Online mode - needs sync:', needsSync);

      if (!needsSync) {
        // Use cached rules if available and no sync needed
        const cachedRulesStr = await vscode.workspace.getConfiguration().get<string>(RulesViewProvider.RULES_CACHE_KEY);
        if (cachedRulesStr) {
          const cachedRules = JSON.parse(cachedRulesStr) as Rule[];
          console.log('Using cached rules, no sync needed');
          return { rules: cachedRules, needsSync: false, isOffline: false };
        }
      }

      // Try to sync if needed
      if (needsSync) {
        try {
          const syncedRules = await this._syncRules();
          return { rules: syncedRules, needsSync: false, isOffline: false };
        } catch (error) {
          console.log('Sync failed, falling back to local rules:', error);
          return { rules: localRules, needsSync: true, isOffline: true };
        }
      }

      // Default fallback to local rules
      return { rules: localRules, needsSync: false, isOffline: false };

    } catch (error) {
      console.error('Error in _loadRules:', error);
      vscode.window.showErrorMessage('Failed to load rules. Using local rules as fallback.');
      return { rules: localRules, needsSync: true, isOffline: true };
    }
  }

  private async _loadLocalRules(): Promise<Rule[]> {
    console.log('Starting _loadLocalRules function');
    try {
      console.log('Loading rules from:', RulesViewProvider.RULES_JSON_PATH);
      if (!fs.existsSync(RulesViewProvider.RULES_JSON_PATH)) {
        console.log('Rules.json not found');
        return [];
      }

      const content = fs.readFileSync(RulesViewProvider.RULES_JSON_PATH, 'utf-8');
      const rules = JSON.parse(content) as Rule[];
      console.log('Successfully loaded rules from JSON, count:', rules.length);
      return rules;
    } catch (error) {
      console.error('Error loading rules from JSON:', error);
      return [];
    }
  }

  private async _syncRules(): Promise<Rule[]> {
    try {
      const response = await fetch(RulesViewProvider.RULES_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch rules: ${response.statusText}`);
      }
      
      const rules = await response.json() as Rule[];
      const rulesJson = JSON.stringify(rules, null, 2); // Pretty print JSON
      
      // Save to both locations
      try {
        // Save to webview-ui build assets for local/offline access
        fs.writeFileSync(RulesViewProvider.RULES_JSON_PATH, rulesJson);
        console.log('Saved rules to webview assets:', RulesViewProvider.RULES_JSON_PATH);
      } catch (error) {
        console.error('Error saving rules files:', error);
        throw new Error('Failed to save rules locally');
      }
      
      // Save to VSCode configuration cache
      await vscode.workspace.getConfiguration().update(RulesViewProvider.RULES_CACHE_KEY, JSON.stringify(rules), true);
      await this._setLastSync(Date.now());
      
      if (this._panel) {
        this._panel.webview.postMessage({
          type: 'syncComplete',
          lastSync: Date.now()
        });
      }

      vscode.window.showInformationMessage('Rules synced successfully!');
      return rules;
    } catch (error) {
      console.error('Error syncing rules:', error);
      throw error; // Re-throw to handle in _loadRules
    }
  }

  private async _getLastSync(): Promise<number | null> {
    const value = await vscode.workspace.getConfiguration().get(RulesViewProvider.LAST_SYNC_KEY);
    return typeof value === 'number' ? value : null;
  }

  private async _setLastSync(timestamp: number) {
    await vscode.workspace.getConfiguration().update(RulesViewProvider.LAST_SYNC_KEY, timestamp, true);
  }

  private async _setRule(rule: Rule) {
    console.log('Setting rule:', rule);
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      console.log('No workspace folder available');
      vscode.window.showErrorMessage('No workspace folder available');
      return;
    }

    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    
    // Check if file exists
    if (fs.existsSync(cursorRulesPath)) {
      const choice = await vscode.window.showWarningMessage(
        'A .cursorrules file already exists. Do you want to overwrite it?',
        'Yes',
        'No'
      );
      
      if (choice !== 'Yes') {
        return;
      }
    }

    try {
      fs.writeFileSync(cursorRulesPath, rule.content);
      vscode.window.showInformationMessage(`Successfully applied rule: ${rule.title}`);
    } catch (error) {
      console.error('Error writing rule file:', error);
      vscode.window.showErrorMessage('Failed to apply rule. Please check console for details.');
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    console.log('Getting HTML for webview');
    const stylesUri = getUri(webview, this._extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    const scriptUri = getUri(webview, this._extensionUri, ["webview-ui", "build", "assets", "index.js"]);

    const resourceUris = {
      stylesUri: stylesUri.toString(),
      scriptUri: scriptUri.toString()
    };
    console.log('Resource URIs:', resourceUris);

    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; connect-src ${webview.cspSource} vscode-webview:;">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Cursor Rules Viewer</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }
} 