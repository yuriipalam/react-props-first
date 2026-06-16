import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const defaultVersions = ["18.3.31", "19.2.17"];
const versions =
  process.argv.length > 2 ? process.argv.slice(2) : readVersionList(process.env.REACT_TYPES_MATRIX);
const cacheRoot = path.join(root, ".tmp", "react-types-compat");

mkdirSync(cacheRoot, { recursive: true });

for (const version of versions) {
  const installPrefix = path.join(cacheRoot, version);
  const typesRoot = path.join(installPrefix, "node_modules", "@types");
  const packageJson = path.join(typesRoot, "react", "package.json");

  if (!existsSync(packageJson)) {
    run("npm", [
      "install",
      "--prefix",
      installPrefix,
      "--no-save",
      "--package-lock=false",
      "--ignore-scripts",
      `@types/react@${version}`
    ]);
  }

  const installedVersion = JSON.parse(readFileSync(packageJson, "utf8")).version;

  console.log(`\n@types/react ${installedVersion}`);
  run(process.execPath, ["--test", "tests/completions.test.js"], {
    REACT_TYPES_ROOT: typesRoot,
    REACT_TYPES_VERSION: installedVersion
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
