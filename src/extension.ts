import * as vscode from "vscode";

const pluginId = "react-props-first-ts-plugin";

type TypeScriptExtensionApi = {
  configurePlugin(pluginId: string, configuration: unknown): void;
};

type TypeScriptExtension = vscode.Extension<{
  getAPI(version: 0): TypeScriptExtensionApi | undefined;
}>;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  await configureTypeScriptPlugin();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("reactPropsFirst")) {
        void configureTypeScriptPlugin();
      }
    })
  );
}

export function deactivate(): void {
  // No extension-host resources are kept alive.
}

async function configureTypeScriptPlugin(): Promise<void> {
  const tsExtension = vscode.extensions.getExtension("vscode.typescript-language-features") as
    | TypeScriptExtension
    | undefined;

  if (!tsExtension) {
    return;
  }

  await tsExtension.activate();
  const api = tsExtension.exports?.getAPI?.(0);

  if (!api) {
    return;
  }

  api.configurePlugin(pluginId, readConfiguration());
}

function readConfiguration(): Record<string, boolean> {
  const configuration = vscode.workspace.getConfiguration("reactPropsFirst");

  return {
    enabled: configuration.get("enabled", true),
    enableJavaScript: configuration.get("enableJavaScript", true),
    debug: configuration.get("debug", false)
  };
}
