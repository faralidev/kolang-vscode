# Changelog

All notable changes to the **kolang-vscode** extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-08-26

Ported highlighting, documentation, and linter integration from the
[kolang-ide](https://github.com/faralidev/kolang-ide) Electron editor. This is
the first open-source release.

### Added

- **Linter integration** — shells out to the
  [`kolang-linter`](https://github.com/faralidev/kolang-linter) binary and
  reports diagnostics live as you type (debounced, 400 ms by default). Covers
  all 13 rules: `syntax-error`, `unclosed-string`, `unclosed-comment`,
  `no-implicit-truthiness`, `negation-no-bang-eq`, `dot-access`,
  `line-too-long`, `mixed-indentation`, `trailing-whitespace`,
  `undefined-variable`, `unused-variable`, `naming-convention`,
  `duplicate-import`.
  - New settings: `kolang.linter.enable`, `kolang.linter.path`,
    `kolang.linter.delay`.
  - Graceful degradation: if the binary is missing, linting is silently
    disabled (one warning is logged) and the rest of the extension still works.
- **Hover documentation** — hovering over keywords, builtin functions, types,
  modules, exceptions, and literals shows a short Persian description. Doc data
  extracted from `kolang-language.js` into `data/kolang-docs.json`.
- **Autocompletion** — keyword / builtin-function / type / module / exception /
  literal / snippet completions plus user-defined identifiers (functions,
  classes, variables, for-loop vars) from the current document. Ezafe (`ِ`
  U+0650) is a trigger character for member access.
- **TextMate grammar** rewritten from the kolang-ide `StreamLanguage`
  tokenizer: Persian + Latin identifiers (ZWNJ-aware), Persian-digit number
  literals (`۰-۹`, hex `۰x`, binary `۰b`, octal `۰o`, Persian decimal `٫`,
  group separator `٬`), guillemet strings `«…»`, line (`/`) and block
  (`// … //`) comments, ezafe `ِ` as a distinct operator token, all 23 operators
  (longest-match-first), keyword classification (control / declaration / copula
  / logical / other), exception classes, builtin functions/types, module names,
  boolean/null literals, `خود`/`والد`, decorator `پوشش`, and function-call
  detection (`identifier(`).
- **Themes refreshed** with the Catppuccin Mocha (dark) and Latte (light)
  palettes — token colors now match the kolang-ide editor exactly.
- `data/kolang-docs.json` — single source of truth for hover docs and
  completions, extracted from kolang-ide.

### Changed

- `publisher` → `faralidev`.
- `repository.url` → `https://github.com/faralidev/kolang-vscode`.
- Version bumped to `0.2.0`.

### Fixed

- README now documents the **correct** Kolang syntax: guillemet strings (`«…»`,
  not backticks), slash comments (`/` line, `// … //` block, not `«»`).
  Removed the incorrect `{...}` interpolation mention.

## [0.1.0] — 2025-08-24

Initial release.

- TextMate grammar, two themes, snippets, RTL keybindings, `insertRLM` and
  `wrapInBackticks` commands, language configuration.
