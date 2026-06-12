import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const command = process.argv[2];

if (command !== "package" && command !== "publish") {
  console.error("Usage: node scripts/vsce-package.mjs <package|publish> [vsce args...]");
  process.exit(1);
}

const root = process.cwd();
const staging = join(root, ".vsce-build");
const extraArgs = process.argv.slice(3);
const rootPackageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const pluginPackageJson = JSON.parse(
  await readFile(join(root, "packages", "react-props-first-ts-plugin", "package.json"), "utf8")
);

const extensionPackageJson = {
  ...rootPackageJson,
  scripts: {},
  dependencies: {
    "react-props-first-ts-plugin": pluginPackageJson.version
  },
  devDependencies: undefined
};

await rm(staging, { force: true, recursive: true });
await mkdir(join(staging, "dist"), { recursive: true });
await mkdir(join(staging, "node_modules", "react-props-first-ts-plugin"), { recursive: true });

await writeFile(
  join(staging, "package.json"),
  `${JSON.stringify(extensionPackageJson, null, 2)}\n`
);
await writeFile(join(staging, ".vscodeignore"), "");
await cp(join(root, "README.md"), join(staging, "README.md"));
await cp(join(root, "LICENSE"), join(staging, "LICENSE"));
await cp(join(root, "dist", "extension.js"), join(staging, "dist", "extension.js"));
await cp(
  join(root, "packages", "react-props-first-ts-plugin", "package.json"),
  join(staging, "node_modules", "react-props-first-ts-plugin", "package.json")
);
await cp(
  join(root, "packages", "react-props-first-ts-plugin", "dist"),
  join(staging, "node_modules", "react-props-first-ts-plugin", "dist"),
  { recursive: true }
);

const vsceBin = resolve(root, "node_modules", ".bin", "vsce");
const args =
  command === "package"
    ? ["package", "--out", join(root, `${rootPackageJson.name}-${rootPackageJson.version}.vsix`)]
    : ["publish"];

await run(vsceBin, [...args, ...extraArgs], staging);

function run(bin, args, cwd) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(bin, args, {
      cwd,
      stdio: "inherit"
    });

    child.on("error", rejectRun);
    child.on("exit", (code) => {
      if (code === 0) {
        resolveRun();
      } else {
        rejectRun(new Error(`${bin} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}
