import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as vscode from "vscode";

export async function runSmokeTest(): Promise<void> {
  const uri = vscode.Uri.file(path.resolve(__dirname, "../../../test-workspace/src/App.tsx"));
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);

  const markerPosition = document.getText().indexOf("/*cursor*/");
  assert.notEqual(markerPosition, -1, "fixture must contain /*cursor*/ marker");

  const completions = await waitForCompletions(uri, document.positionAt(markerPosition), [
    "variant",
    "loading",
    "aria-label"
  ]);

  const orderedItems = [...completions.items].sort((left, right) => {
    const leftSortText = left.sortText ?? labelToString(left.label);
    const rightSortText = right.sortText ?? labelToString(right.label);

    if (leftSortText === rightSortText) {
      return labelToString(left.label).localeCompare(labelToString(right.label));
    }

    return leftSortText.localeCompare(rightSortText);
  });

  assertBefore(orderedItems, "variant", "aria-label");
  assertBefore(orderedItems, "loading", "aria-label");
}

async function waitForCompletions(
  uri: vscode.Uri,
  position: vscode.Position,
  expectedLabels: readonly string[]
): Promise<vscode.CompletionList> {
  let latest: vscode.CompletionList | undefined;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    latest = await vscode.commands.executeCommand<vscode.CompletionList>(
      "vscode.executeCompletionItemProvider",
      uri,
      position
    );

    const labels = new Set(latest?.items.map((item) => labelToName(item.label)) ?? []);

    if (expectedLabels.every((label) => labels.has(label))) {
      return latest;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const labels = latest?.items.slice(0, 40).map((item) => labelToName(item.label)) ?? [];
  assert.fail(
    `expected VS Code completions to include ${expectedLabels.join(", ")}; got ${labels.join(", ")}`
  );
}

function assertBefore(
  items: readonly vscode.CompletionItem[],
  earlier: string,
  later: string
): void {
  const earlierIndex = items.findIndex((item) => labelToName(item.label) === earlier);
  const laterIndex = items.findIndex((item) => labelToName(item.label) === later);

  assert.notEqual(earlierIndex, -1, `expected ${earlier} completion`);
  assert.notEqual(laterIndex, -1, `expected ${later} completion`);
  assert.ok(
    earlierIndex < laterIndex,
    `expected ${earlier} to appear before ${later}; got ${earlierIndex} >= ${laterIndex}`
  );
}

function labelToString(label: string | vscode.CompletionItemLabel): string {
  return typeof label === "string" ? label : label.label;
}

function labelToName(label: string | vscode.CompletionItemLabel): string {
  return labelToString(label).replace(/\?$/, "");
}
