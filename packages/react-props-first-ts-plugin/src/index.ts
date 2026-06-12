import type * as tsModule from "typescript/lib/tsserverlibrary";

type TypeScript = typeof tsModule;
type PluginConfig = {
  enabled: boolean;
  enableJavaScript: boolean;
  debug: boolean;
};

const defaultConfig: PluginConfig = {
  enabled: true,
  enableJavaScript: true,
  debug: false
};

function init({ typescript: ts }: { typescript: TypeScript }): tsModule.server.PluginModule {
  let config = { ...defaultConfig };

  function create(info: tsModule.server.PluginCreateInfo): tsModule.LanguageService {
    config = normalizeConfig(info.config);

    const proxy = createLanguageServiceProxy(ts, info.languageService);

    proxy.getCompletionsAtPosition = (fileName, position, options, formattingSettings) => {
      const prior = info.languageService.getCompletionsAtPosition(
        fileName,
        position,
        options,
        formattingSettings
      );

      if (!prior || !shouldProcessFile(fileName, config)) {
        return prior;
      }

      const program = info.languageService.getProgram();
      const sourceFile = program?.getSourceFile(fileName);

      if (!program || !sourceFile) {
        return prior;
      }

      const openingElement = getJsxOpeningElementAtPosition(ts, sourceFile, position);

      if (!openingElement || isIntrinsicElementName(ts, openingElement.tagName)) {
        return prior;
      }

      const checker = program.getTypeChecker();
      const propsType = getPropsType(ts, checker, openingElement);

      if (!propsType) {
        return prior;
      }

      const rankedEntries = rankCompletionEntries(ts, checker, propsType, prior.entries);

      if (!rankedEntries.changed) {
        return prior;
      }

      log(
        info,
        `ranked JSX props in ${fileName}: custom=${rankedEntries.customCount}, inherited=${rankedEntries.inheritedCount}`
      );

      return {
        ...prior,
        entries: rankedEntries.entries
      };
    };

    return proxy;
  }

  function onConfigurationChanged(nextConfig: unknown): void {
    config = normalizeConfig(nextConfig);
  }

  function log(info: tsModule.server.PluginCreateInfo, message: string): void {
    if (config.debug) {
      info.project.projectService.logger.info(`[react-props-first] ${message}`);
    }
  }

  return {
    create,
    onConfigurationChanged
  };
}

function createLanguageServiceProxy(
  ts: TypeScript,
  languageService: tsModule.LanguageService
): tsModule.LanguageService {
  const proxy: Partial<tsModule.LanguageService> = Object.create(null);

  for (const key of Object.keys(languageService) as Array<keyof tsModule.LanguageService>) {
    const value = languageService[key];

    if (typeof value === "function") {
      proxy[key] = ((...args: unknown[]) =>
        (value as (...args: unknown[]) => unknown).apply(languageService, args)) as never;
    } else {
      proxy[key] = value as never;
    }
  }

  return proxy as tsModule.LanguageService;
}

function normalizeConfig(config: unknown): PluginConfig {
  const input = isRecord(config) ? config : {};

  return {
    enabled: readBoolean(input.enabled, defaultConfig.enabled),
    enableJavaScript: readBoolean(input.enableJavaScript, defaultConfig.enableJavaScript),
    debug: readBoolean(input.debug, defaultConfig.debug)
  };
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shouldProcessFile(fileName: string, config: PluginConfig): boolean {
  if (!config.enabled) {
    return false;
  }

  const normalized = fileName.toLowerCase();

  if (normalized.endsWith(".tsx")) {
    return true;
  }

  if (normalized.endsWith(".jsx")) {
    return config.enableJavaScript;
  }

  return false;
}

function getJsxOpeningElementAtPosition(
  ts: TypeScript,
  sourceFile: tsModule.SourceFile,
  position: number
): tsModule.JsxOpeningLikeElement | undefined {
  const node = findSmallestContainingNode(ts, sourceFile, position);

  if (!node) {
    return undefined;
  }

  const openingElement = findAncestor(
    node,
    (candidate): candidate is tsModule.JsxOpeningLikeElement =>
      ts.isJsxOpeningElement(candidate) || ts.isJsxSelfClosingElement(candidate)
  );

  if (!openingElement) {
    return undefined;
  }

  if (position <= openingElement.tagName.end || position > openingElement.end) {
    return undefined;
  }

  for (
    let current: tsModule.Node | undefined = node;
    current && current !== openingElement;
    current = current.parent
  ) {
    if (
      ts.isStringLiteral(current) ||
      ts.isJsxExpression(current) ||
      ts.isJsxSpreadAttribute(current) ||
      ts.isJsxClosingElement(current)
    ) {
      return undefined;
    }
  }

  return openingElement;
}

function findSmallestContainingNode(
  ts: TypeScript,
  sourceFile: tsModule.SourceFile,
  position: number
): tsModule.Node | undefined {
  let match: tsModule.Node | undefined;

  function visit(node: tsModule.Node): void {
    if (position < node.getFullStart() || position > node.getEnd()) {
      return;
    }

    match = node;
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return match;
}

function findAncestor<T extends tsModule.Node>(
  node: tsModule.Node | undefined,
  predicate: (node: tsModule.Node) => node is T
): T | undefined {
  for (let current = node; current; current = current.parent) {
    if (predicate(current)) {
      return current;
    }
  }

  return undefined;
}

function isIntrinsicElementName(ts: TypeScript, tagName: tsModule.JsxTagNameExpression): boolean {
  return ts.isIdentifier(tagName) && /^[a-z]/.test(tagName.text);
}

function getPropsType(
  ts: TypeScript,
  checker: tsModule.TypeChecker,
  openingElement: tsModule.JsxOpeningLikeElement
): tsModule.Type | undefined {
  const contextualAttributesType = checker.getContextualType(openingElement.attributes);

  if (contextualAttributesType) {
    return checker.getApparentType(contextualAttributesType);
  }

  const tagType = checker.getTypeAtLocation(openingElement.tagName);
  const callSignature = checker.getSignaturesOfType(tagType, ts.SignatureKind.Call)[0];
  const callPropsType = getFirstParameterType(checker, callSignature, openingElement.tagName);

  if (callPropsType) {
    return checker.getApparentType(callPropsType);
  }

  const constructSignature = checker.getSignaturesOfType(tagType, ts.SignatureKind.Construct)[0];
  const constructPropsType = getFirstParameterType(
    checker,
    constructSignature,
    openingElement.tagName
  );

  if (constructPropsType) {
    return checker.getApparentType(constructPropsType);
  }

  return undefined;
}

function getFirstParameterType(
  checker: tsModule.TypeChecker,
  signature: tsModule.Signature | undefined,
  location: tsModule.Node
): tsModule.Type | undefined {
  const parameter = signature?.parameters[0];

  return parameter ? checker.getTypeOfSymbolAtLocation(parameter, location) : undefined;
}

function rankCompletionEntries(
  ts: TypeScript,
  checker: tsModule.TypeChecker,
  propsType: tsModule.Type,
  entries: readonly tsModule.CompletionEntry[]
): {
  changed: boolean;
  entries: tsModule.CompletionEntry[];
  customCount: number;
  inheritedCount: number;
} {
  let customCount = 0;
  let inheritedCount = 0;
  let changed = false;

  const ranked = entries.map((entry) => {
    const rank = classifyCompletionEntry(ts, checker, propsType, entry.name);

    if (rank === "custom") {
      customCount += 1;
    } else if (rank === "inherited") {
      inheritedCount += 1;
    }

    const prefix = rank === "custom" ? "0" : rank === "inherited" ? "1" : "2";
    const originalSortText = entry.sortText ?? entry.name;
    const sortText = `${prefix}:${originalSortText}:${entry.name}`;

    if (sortText !== entry.sortText) {
      changed = true;
    }

    return {
      ...entry,
      sortText
    };
  });

  return {
    changed: changed && customCount > 0 && inheritedCount > 0,
    entries: ranked,
    customCount,
    inheritedCount
  };
}

function classifyCompletionEntry(
  ts: TypeScript,
  checker: tsModule.TypeChecker,
  propsType: tsModule.Type,
  name: string
): "custom" | "inherited" | "unknown" {
  if (name.startsWith("aria-") || name.startsWith("data-")) {
    return "inherited";
  }

  const prop = checker.getPropertyOfType(propsType, name);

  if (!prop) {
    return "unknown";
  }

  const declarations = prop.getDeclarations() ?? [];

  if (declarations.length === 0) {
    return "unknown";
  }

  const hasCustomDeclaration = declarations.some(
    (declaration) => !isReactOrDomDeclarationFile(ts, declaration.getSourceFile().fileName)
  );

  return hasCustomDeclaration ? "custom" : "inherited";
}

function isReactOrDomDeclarationFile(ts: TypeScript, fileName: string): boolean {
  const normalized = fileName.replace(/\\/g, "/").toLowerCase();
  const defaultLibraryPath = ts
    .getDefaultLibFilePath({ target: ts.ScriptTarget.ES2022 })
    .replace(/\\/g, "/")
    .toLowerCase();
  const typescriptLibPath = defaultLibraryPath.slice(0, defaultLibraryPath.lastIndexOf("/") + 1);

  return (
    normalized.includes("/node_modules/@types/react/") ||
    normalized.includes("/node_modules/@types/prop-types/") ||
    (normalized.startsWith(typescriptLibPath) &&
      /\/lib\.(dom|dom\.iterable|webworker)/.test(normalized))
  );
}

export = init;
