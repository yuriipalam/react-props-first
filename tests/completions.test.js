const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const pluginInit = require("../packages/react-props-first-ts-plugin/dist/index.js");

const root = path.resolve(__dirname, "..");

test("TSX custom props sort before inherited React DOM props", () => {
  const source = `
    import * as React from "react";

    interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      variant?: "primary" | "secondary";
      size?: "sm" | "md";
      loading?: boolean;
    }

    function Button(props: ButtonProps) {
      return <button {...props} />;
    }

    const demo = <Button /*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/button.tsx"),
    source
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "variant", "disabled");
  assertBefore(entries, "size", "type");
  assertBefore(entries, "loading", "onClick");
});

test("TSX ranking updates at a partial attribute name position", () => {
  const source = `
    import * as React from "react";

    type ButtonProps = {
      variant?: "primary" | "secondary";
      loading?: boolean;
    } & React.ButtonHTMLAttributes<HTMLButtonElement>;

    function Button(props: ButtonProps) {
      return <button {...props} />;
    }

    const demo = <Button v/*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/partial.tsx"),
    source
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "variant", "disabled");
  assertBefore(entries, "variant", "onClick");
});

test("JSX custom props sort first when JavaScript inference provides prop types", () => {
  const source = `
    import * as React from "react";

    /**
     * @typedef {React.ButtonHTMLAttributes<HTMLButtonElement> & {
     *   variant?: "primary" | "secondary",
     *   loading?: boolean
     * }} ButtonProps
     */

    /** @param {ButtonProps} props */
    function Button(props) {
      return <button {...props} />;
    }

    const demo = <Button /*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/button.jsx"),
    source,
    allowJs: true
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "variant", "disabled");
  assertBefore(entries, "loading", "onClick");
});

test("non-JSX completions keep TypeScript's original order", () => {
  const source = `
    const value = {
      zebra: 1,
      alpha: 2,
    };

    value./*cursor*/
  `;

  const fileName = path.join(root, "tests/fixtures/object.ts");
  const { source: cleanSource, position } = removeCursor(source);
  const languageService = createBaseLanguageService({
    fileName,
    source: cleanSource
  });
  const pluginLanguageService = createPluginLanguageService(languageService);

  const prior = languageService.getCompletionsAtPosition(fileName, position, {});
  const next = pluginLanguageService.getCompletionsAtPosition(fileName, position, {});

  assert.deepEqual(
    next.entries.map((entry) => [entry.name, entry.sortText]),
    prior.entries.map((entry) => [entry.name, entry.sortText])
  );
});

function createService({ fileName, source, allowJs = false }) {
  const { source: cleanSource, position } = removeCursor(source);
  const languageService = createBaseLanguageService({
    fileName,
    source: cleanSource,
    allowJs
  });

  return {
    fileName,
    position,
    languageService: createPluginLanguageService(languageService)
  };
}

function getCompletionEntries(service) {
  const completions = service.languageService.getCompletionsAtPosition(
    service.fileName,
    service.position,
    {}
  );

  assert.ok(completions, "expected completions");
  return sortByPresentationOrder(completions.entries);
}

function createPluginLanguageService(languageService) {
  const plugin = pluginInit({ typescript: ts });

  const info = {
    languageService,
    config: {
      enabled: true,
      enableJavaScript: true,
      debug: false
    },
    project: {
      projectService: {
        logger: {
          info() {}
        }
      }
    }
  };

  return plugin.create(info);
}

function createBaseLanguageService({ fileName, source, allowJs = false }) {
  const files = new Map([[fileName, source]]);
  const versions = new Map([[fileName, "0"]]);

  const compilerOptions = {
    allowJs,
    checkJs: allowJs,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.Node16,
    moduleResolution: ts.ModuleResolutionKind.Node16,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    types: ["react"]
  };

  const host = {
    getCompilationSettings: () => compilerOptions,
    getCurrentDirectory: () => root,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => [fileName],
    getScriptSnapshot: (requestedFileName) => {
      const text = files.get(requestedFileName) ?? ts.sys.readFile(requestedFileName);

      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getScriptVersion: (requestedFileName) => versions.get(requestedFileName) ?? "0",
    readDirectory: ts.sys.readDirectory,
    readFile: ts.sys.readFile,
    fileExists: (requestedFileName) =>
      files.has(requestedFileName) || ts.sys.fileExists(requestedFileName),
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories
  };

  return ts.createLanguageService(host);
}

function removeCursor(source) {
  const marker = "/*cursor*/";
  const position = source.indexOf(marker);

  assert.notEqual(position, -1, "fixture must contain /*cursor*/ marker");

  return {
    source: source.slice(0, position) + source.slice(position + marker.length),
    position
  };
}

function assertBefore(entries, earlier, later) {
  const earlierIndex = entries.findIndex((entry) => entry.name === earlier);
  const laterIndex = entries.findIndex((entry) => entry.name === later);

  assert.notEqual(earlierIndex, -1, `expected ${earlier} completion`);
  assert.notEqual(laterIndex, -1, `expected ${later} completion`);
  assert.ok(
    earlierIndex < laterIndex,
    `expected ${earlier} to sort before ${later}; got ${earlierIndex} >= ${laterIndex}`
  );
}

function sortByPresentationOrder(entries) {
  return [...entries].sort((left, right) => {
    const leftSortText = left.sortText ?? left.name;
    const rightSortText = right.sortText ?? right.name;

    if (leftSortText === rightSortText) {
      return left.name.localeCompare(right.name);
    }

    return leftSortText.localeCompare(rightSortText);
  });
}
