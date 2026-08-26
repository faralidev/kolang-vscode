# Contributing to kolang-vscode

از مشارکت شما استقبال می‌کنیم! / We welcome your contributions!

## Ways to contribute / روش‌های مشارکت

- Report bugs or request features via [GitHub Issues](https://github.com/faralidev/kolang-vscode/issues).
- Improve the grammar, themes, or docs — see below.
- Translate or improve the README / hover documentation.

## Development setup / راه‌اندازی توسعه

```bash
git clone https://github.com/faralidev/kolang-vscode
cd kolang-vscode
npm install
```

Press `F5` in VS Code to launch an **Extension Development Host** with the
extension loaded. Open a `.kolang` file to test.

### Packaging

```bash
npx @vscode/vsce package
# → kolang-0.2.0.vsix
```

Install locally with:

```bash
code --install-extension kolang-0.2.0.vsix
```

## Architecture / معماری

The extension is a single CommonJS module (`extension.js`) plus static assets:

```
extension.js              Linter, hover, completion, commands
data/kolang-docs.json     Keyword/builtin/snippet data (hover + completion source of truth)
syntaxes/kolang.tmLanguage.json   TextMate grammar
snippets/kolang.json      VS Code snippet definitions
themes/kolang-dark.json   Catppuccin Mocha dark theme
themes/kolang-light.json  Catppuccin Latte light theme
language-configuration.json   Bracket matching, auto-closing, indentation
rtl.css                   Optional workbench CSS for true RTL (via Custom CSS loader)
```

### Where the data comes from

`data/kolang-docs.json` and the TextMate grammar are **ported from
[kolang-ide](https://github.com/faralidev/kolang-ide)/kolang-language.js**. If
the language's keywords, builtins, or snippets change upstream, update both
this repo and kolang-ide to keep them in sync.

### Linter

The extension shells out to the external
[`kolang-linter`](https://github.com/faralidev/kolang-linter) Go binary. It is
**not** bundled with the extension — users install it separately. The contract
is: source on stdin → `{"diagnostics":[{"line","col","endLine","endCol","severity","message","rule"}]}`
JSON on stdout (1-based positions).

## Pull requests / درخواست‌های pull

1. Fork the repo and create a branch: `git checkout -b my-feature`.
2. Make your change. Keep `extension.js` as CommonJS (no ESM/TypeScript).
3. If you change the grammar or themes, verify they're valid JSON.
4. Update the `CHANGELOG.md` under an `[Unreleased]` section.
5. Open a PR with a clear description. Link any related issues.

## Code style / سبک کد

- `extension.js` is plain CommonJS JavaScript — no build step, no transpilation.
- Section comments (`// --- Section ---`) separate features.
- Persian doc strings should use real ZWNJ (U+200C), not ASCII hyphens.
- Keep the existing bilingual (Persian/English) tone in user-facing text.

## License / پروانه

By contributing, you agree that your contributions are licensed under the MIT
License. See [LICENSE](LICENSE).
