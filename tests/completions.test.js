const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const test = require("node:test");

const pluginInit = require("../packages/react-props-first-ts-plugin/dist/index.js");

const root = path.resolve(__dirname, "..");
const ts = loadTypeScript();

test("test harness uses the expected TypeScript runtime", () => {
  const expectedVersion = process.env.TYPESCRIPT_VERSION;

  if (expectedVersion) {
    assert.equal(ts.version, expectedVersion);
  }

  assert.match(ts.version, /^\d+\.\d+\.\d+/);
});

test("test harness uses the expected React type package", () => {
  const expectedVersion = process.env.REACT_TYPES_VERSION;
  const reactTypesRoot = process.env.REACT_TYPES_ROOT;

  if (!expectedVersion) {
    return;
  }

  assert.ok(reactTypesRoot, "REACT_TYPES_ROOT must be set with REACT_TYPES_VERSION");

  const packageJson = path.join(path.resolve(reactTypesRoot), "react", "package.json");
  const actualVersion = JSON.parse(fs.readFileSync(packageJson, "utf8")).version;

  assert.equal(actualVersion, expectedVersion);
});

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

test("TSX custom props sort first for React.forwardRef components", () => {
  const source = `
    import * as React from "react";

    interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      variant?: "primary" | "secondary";
      loading?: boolean;
    }

    const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
      props,
      ref
    ) {
      return <button ref={ref} {...props} />;
    });

    const demo = <Button /*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/forward-ref.tsx"),
    source
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "variant", "disabled");
  assertBefore(entries, "loading", "onClick");
});

test("TSX custom props sort first for React.memo components", () => {
  const source = `
    import * as React from "react";

    interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      variant?: "primary" | "secondary";
      loading?: boolean;
    }

    const ButtonBase = React.forwardRef<HTMLButtonElement, ButtonProps>(function ButtonBase(
      props,
      ref
    ) {
      return <button ref={ref} {...props} />;
    });

    const Button = React.memo(ButtonBase);

    const demo = <Button /*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/memo.tsx"),
    source
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "variant", "disabled");
  assertBefore(entries, "loading", "onClick");
});

test("TSX custom props sort first for class components", () => {
  const source = `
    import * as React from "react";

    interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      variant?: "primary" | "secondary";
      loading?: boolean;
    }

    class Button extends React.Component<ButtonProps> {
      render() {
        return <button {...this.props} />;
      }
    }

    const demo = <Button /*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/class-component.tsx"),
    source
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "variant", "disabled");
  assertBefore(entries, "loading", "onClick");
});

test("TSX custom props sort first with ComponentPropsWithoutRef and Omit", () => {
  const source = `
    import * as React from "react";

    type ButtonProps = Omit<React.ComponentPropsWithoutRef<"button">, "size"> & {
      variant?: "primary" | "secondary";
      size?: "sm" | "md";
      loading?: boolean;
    };

    function Button(props: ButtonProps) {
      return <button {...props} />;
    }

    const demo = <Button /*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/props-without-ref.tsx"),
    source
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "variant", "disabled");
  assertBefore(entries, "size", "type");
  assertBefore(entries, "loading", "onClick");
});

test("TSX custom props sort first for generic components", () => {
  const source = `
    import * as React from "react";

    type ButtonProps<TValue extends string = string> =
      React.ButtonHTMLAttributes<HTMLButtonElement> & {
      choice?: TValue;
      onChoice?: (value: TValue) => void;
    };

    function Button<TValue extends string = string>(props: ButtonProps<TValue>) {
      return <button {...props} />;
    }

    const demo = <Button /*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/generic-component.tsx"),
    source
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "choice", "disabled");
  assertBefore(entries, "onChoice", "onClick");
});

test("TSX custom props sort first for discriminated union props", () => {
  const source = `
    import * as React from "react";

    type ButtonActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
      as?: "button";
      variant?: "primary" | "secondary";
      loading?: boolean;
    };

    type LinkActionProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      as: "a";
      variant?: "primary" | "secondary";
      href: string;
    };

    function Action(props: ButtonActionProps | LinkActionProps) {
      return props.as === "a" ? <a {...props} /> : <button {...props} />;
    }

    const demo = <Action /*cursor*/ />;
  `;

  const service = createService({
    fileName: path.join(root, "tests/fixtures/union-props.tsx"),
    source
  });

  const entries = getCompletionEntries(service);

  assertBefore(entries, "as", "onClick");
  assertBefore(entries, "variant", "onClick");
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

test("intrinsic JSX elements keep TypeScript's original completion order", () => {
  const source = `
    import * as React from "react";

    const demo = <button /*cursor*/ />;
  `;

  assertPluginKeepsCompletionOrder({
    fileName: path.join(root, "tests/fixtures/intrinsic.tsx"),
    source
  });
});

test("disabled plugin keeps TypeScript's original JSX completion order", () => {
  const source = `
    import * as React from "react";

    interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      variant?: "primary" | "secondary";
      loading?: boolean;
    }

    function Button(props: ButtonProps) {
      return <button {...props} />;
    }

    const demo = <Button /*cursor*/ />;
  `;

  assertPluginKeepsCompletionOrder({
    fileName: path.join(root, "tests/fixtures/disabled.tsx"),
    source,
    pluginConfig: {
      enabled: false
    }
  });
});

test("JSX files keep TypeScript's original completion order when JavaScript support is disabled", () => {
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

  assertPluginKeepsCompletionOrder({
    fileName: path.join(root, "tests/fixtures/javascript-disabled.jsx"),
    source,
    allowJs: true,
    pluginConfig: {
      enableJavaScript: false
    }
  });
});

function loadTypeScript() {
  const override = process.env.TYPESCRIPT_PATH;

  if (!override) {
    return require("typescript");
  }

  const resolvedOverride = path.resolve(override);
  const packageJson = path.join(resolvedOverride, "package.json");

  if (fs.existsSync(packageJson)) {
    return createRequire(packageJson)(resolvedOverride);
  }

  return require(resolvedOverride);
}

function createService({ fileName, source, allowJs = false, pluginConfig = {} }) {
  const { source: cleanSource, position } = removeCursor(source);
  const languageService = createBaseLanguageService({
    fileName,
    source: cleanSource,
    allowJs
  });

  return {
    fileName,
    position,
    languageService: createPluginLanguageService(languageService, pluginConfig)
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

function assertPluginKeepsCompletionOrder({
  fileName,
  source,
  allowJs = false,
  pluginConfig = {}
}) {
  const { source: cleanSource, position } = removeCursor(source);
  const languageService = createBaseLanguageService({
    fileName,
    source: cleanSource,
    allowJs
  });
  const pluginLanguageService = createPluginLanguageService(languageService, pluginConfig);

  const prior = languageService.getCompletionsAtPosition(fileName, position, {});
  const next = pluginLanguageService.getCompletionsAtPosition(fileName, position, {});

  assert.ok(prior, "expected base completions");
  assert.ok(next, "expected plugin completions");
  assert.deepEqual(
    next.entries.map((entry) => [entry.name, entry.sortText]),
    prior.entries.map((entry) => [entry.name, entry.sortText])
  );
}

function createPluginLanguageService(languageService, config = {}) {
  const plugin = pluginInit({ typescript: ts });

  const info = {
    languageService,
    config: {
      enabled: true,
      enableJavaScript: true,
      debug: false,
      ...config
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
  const reactTypesRoot = process.env.REACT_TYPES_ROOT;

  if (reactTypesRoot) {
    compilerOptions.typeRoots = [path.resolve(reactTypesRoot)];
  }

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
