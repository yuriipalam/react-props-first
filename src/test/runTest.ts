import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, "../..");
  const extensionTestsPath = path.resolve(__dirname, "./suite");
  const testWorkspacePath = path.resolve(__dirname, "../../test-workspace");

  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: [testWorkspacePath]
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
