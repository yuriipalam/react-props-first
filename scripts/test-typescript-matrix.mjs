import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const defaultVersions = ["5.5.4", "5.6.3", "5.7.3", "5.8.3", "5.9.3", "6.0.3"];
const versions =
  process.argv.length > 2 ? process.argv.slice(2) : readVersionList(process.env.TYPESCRIPT_MATRIX);
const cacheRoot = path.join(root, ".tmp", "typescript-compat");

mkdirSync(cacheRoot, { recursive: true });

for (const version of versions) {
  const installPrefix = path.join(cacheRoot, version);
  const packageRoot = path.join(installPrefix, "node_modules", "typescript");
  const packageJson = path.join(packageRoot, "package.json");

  if (!existsSync(packageJson)) {
    run("npm", [
      "install",
      "--prefix",
      installPrefix,
      "--no-save",
      "--package-lock=false",
      "--ignore-scripts",
      `typescript@${version}`
    ]);
  }

  const installedVersion = JSON.parse(readFileSync(packageJson, "utf8")).version;

  console.log(`\nTypeScript ${installedVersion}`);
  run(process.execPath, ["--test", "tests/completions.test.js"], {
    TYPESCRIPT_PATH: packageRoot,
    TYPESCRIPT_VERSION: installedVersion
  });
}

function readVersionList(value) {
  return value
    ? value
        .split(",")
        .map((version) => version.trim())
        .filter(Boolean)
    : defaultVersions;
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: {
      ...process.env,
      ...extraEnv
    },
    stdio: "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
