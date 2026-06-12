# React Props First

React Props First is a VS Code extension that prioritizes custom React component props before inherited React, DOM, and ARIA props in JSX completions.

The extension bundles a TypeScript server plugin. Users install the VS Code extension; the plugin runs inside TypeScript's language server and reorders existing completion entries without replacing TypeScript's completion engine.

## Settings

- `reactPropsFirst.enabled`: enable or disable completion ordering.
- `reactPropsFirst.enableJavaScript`: enable ordering in `.jsx` files when TypeScript can infer component props.
- `reactPropsFirst.debug`: write diagnostic messages to the TypeScript server log.

## Development

```sh
npm install
npm test
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

Examples:

- `feat: add jsx prop completion ranking`
- `fix: avoid sorting outside jsx attributes`
- `chore: update lint configuration`
