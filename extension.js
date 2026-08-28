'use strict';

const vscode = require('vscode');
const path = require('path');
const { spawn } = require('child_process');

// ---------------------------------------------------------------------------
// Language data (from data/kolang-docs.json, synced from the kolang-data repo)
// ---------------------------------------------------------------------------

// Each category is an array of [name, Persian detail] pairs; `snippets` is an
// array of { label, detail, body }. Loaded once at startup.
let KOLANG_DOCS = null;
try {
  KOLANG_DOCS = require(path.join(__dirname, 'data', 'kolang-docs.json'));
} catch (err) {
  console.warn('[kolang] could not load data/kolang-docs.json:', err.message);
  KOLANG_DOCS = {
    keywords: [],
    functions: [],
    types: [],
    modules: [],
    exceptions: [],
    literals: [],
    snippets: [],
  };
}

// Word characters for Kolang: Persian/Arabic letters (with U+200C ZWNJ allowed
// as a continuation char), plus ASCII letters/digits/underscore. The ezafe
// U+0650 (ِ) is deliberately excluded so member-access words still resolve.
const WORD_REGEX = /[\u0621-\u064A\u0670-\u06FFA-Za-z_][\u0621-\u064A\u0670-\u06FFA-Za-z0-9_\u200C]*/;

// ---------------------------------------------------------------------------
// Linter state (module-scope so `deactivate` can clean up pending timers)
// ---------------------------------------------------------------------------

/** @type {Map<string, NodeJS.Timeout>} debounce timers keyed by document URI. */
let linterTimers = new Map();

/** @type {vscode.DiagnosticCollection | null} */
let diagnosticCollection = null;

/** @type {{ enable: boolean, path: string, delay: number }} */
let linterConfig = { enable: true, path: 'kolang-linter', delay: 400 };

/** Warn about a missing linter binary only once per session. */
let linterWarned = false;

// ---------------------------------------------------------------------------
// RTL custom-CSS setup state (Custom CSS and JS Loader integration)
// ---------------------------------------------------------------------------

/** ID of the "Custom CSS and JS Loader" marketplace extension. */
const CUSTOM_CSS_EXT_ID = 'be5invis.vscode-custom-css';

/** Tracks whether the RTL setup notification has been shown this session. */
let rtlSetupNotified = false;

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getLinterConfig() {
  const cfg = vscode.workspace.getConfiguration('kolang');
  return {
    enable: cfg.get('linter.enable', true),
    path: cfg.get('linter.path', 'kolang-linter'),
    delay: cfg.get('linter.delay', 400),
  };
}

function isKolangDocument(document) {
  return document.languageId === 'kolang' || document.uri.fsPath.endsWith('.kolang');
}

// ---------------------------------------------------------------------------
// Hover lookup
// ---------------------------------------------------------------------------

function buildHoverLookup(docs) {
  const lookup = new Map();
  const categories = ['keywords', 'functions', 'types', 'modules', 'exceptions', 'literals'];
  for (const category of categories) {
    for (const [name, detail] of docs[category] || []) {
      lookup.set(name, { detail, kind: category });
    }
  }
  return lookup;
}

// ---------------------------------------------------------------------------
// User-defined identifiers (ported from the original Electron editor's kolang-language.js)
// ---------------------------------------------------------------------------

// Variables (plain `=` assignment), function names (تعریف …( ), class names
// (گونه …), and for-loop variables (برای … از/در). A function/class definition
// wins over a plain variable of the same name.
function scanDocumentIdentifiers(docText) {
  const idents = new Map(); // name → 'variable' | 'function' | 'class'
  const idRe = /[\u0621-\u064A\u0670-\u06FFA-Za-z_][\u0621-\u064A\u0670-\u06FFA-Za-z0-9_\u200C]*/;
  const fnRe = new RegExp('^تعریف\\s+(' + idRe.source + ')\\s*\\(');
  const clsRe = new RegExp('^گونه\\s+(' + idRe.source + ')');
  const varRe = new RegExp('^(' + idRe.source + ')\\s*=(?!=)');
  const forRe = new RegExp('^برای\\s+(' + idRe.source + ')\\s+(از|در)');
  for (const line of docText.split('\n')) {
    const trimmed = line.replace(/^\s+/, '');
    // Function definition: تعریف name(
    const fnMatch = trimmed.match(fnRe);
    if (fnMatch) {
      idents.set(fnMatch[1], 'function');
      continue;
    }
    // Class definition: گونه name
    const clsMatch = trimmed.match(clsRe);
    if (clsMatch) {
      idents.set(clsMatch[1], 'class');
      continue;
    }
    // Variable assignment: name = (not ==, +=, …)
    const varMatch = trimmed.match(varRe);
    if (varMatch) {
      if (!idents.has(varMatch[1])) idents.set(varMatch[1], 'variable');
      continue;
    }
    // For-loop variable: برای name از/در
    const forMatch = trimmed.match(forRe);
    if (forMatch) {
      if (!idents.has(forMatch[1])) idents.set(forMatch[1], 'variable');
      continue;
    }
  }
  return idents;
}

// ---------------------------------------------------------------------------
// Feature 3: Completion provider
// ---------------------------------------------------------------------------

function buildCompletionItems(document, prefix, wordRange) {
  const items = [];
  const builtinLabels = new Set(); // builtins win over user-defined identifiers

  const addCategory = (arr, kind) => {
    for (const [label, detail] of arr) {
      const item = new vscode.CompletionItem(label, kind);
      item.detail = detail;
      if (wordRange) item.range = wordRange;
      items.push(item);
      builtinLabels.add(label);
    }
  };

  addCategory(KOLANG_DOCS.keywords || [], vscode.CompletionItemKind.Keyword);
  addCategory(KOLANG_DOCS.functions || [], vscode.CompletionItemKind.Function);
  addCategory(KOLANG_DOCS.types || [], vscode.CompletionItemKind.Class); // builtin type constructors
  addCategory(KOLANG_DOCS.modules || [], vscode.CompletionItemKind.Module);
  addCategory(KOLANG_DOCS.exceptions || [], vscode.CompletionItemKind.Class);
  addCategory(KOLANG_DOCS.literals || [], vscode.CompletionItemKind.Constant);

  for (const snip of KOLANG_DOCS.snippets || []) {
    const item = new vscode.CompletionItem(snip.label, vscode.CompletionItemKind.Snippet);
    item.detail = snip.detail;
    item.insertText = new vscode.SnippetString(snip.body);
    if (wordRange) item.range = wordRange;
    items.push(item);
    builtinLabels.add(snip.label);
  }

  // User-defined identifiers from the current document (skipped if a builtin
  // with the same name already exists — builtins win).
  const docIdents = scanDocumentIdentifiers(document.getText());
  for (const [name, type] of docIdents) {
    if (builtinLabels.has(name)) continue;
    const kind =
      type === 'function'
        ? vscode.CompletionItemKind.Function
        : type === 'class'
          ? vscode.CompletionItemKind.Class
          : vscode.CompletionItemKind.Variable;
    const item = new vscode.CompletionItem(name, kind);
    item.detail = 'تعریف\u200Cشده در برنامه';
    if (wordRange) item.range = wordRange;
    items.push(item);
  }

  // Prefix filter — an empty prefix (start of line, or right after the ezafe)
  // returns everything.
  if (prefix) {
    return items.filter((item) => item.label.startsWith(prefix));
  }
  return items;
}

// ---------------------------------------------------------------------------
// Feature 1: Linter (kolang-linter binary)
// ---------------------------------------------------------------------------

// Debounce a lint for the document: cancel any pending timer, then schedule
// a new one using the configured delay.
function scheduleLint(document) {
  if (!linterConfig.enable || !diagnosticCollection) return;
  const key = document.uri.toString();
  const existing = linterTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    linterTimers.delete(key);
    runLinter(document);
  }, linterConfig.delay);
  linterTimers.set(key, timer);
}

function clearAllLinterTimers() {
  for (const timer of linterTimers.values()) clearTimeout(timer);
  linterTimers.clear();
}

// Map 1-based linter positions to 0-based vscode.Diagnostic objects.
function mapDiagnostics(document, diagnostics) {
  const mapped = [];
  const lastLine = Math.max(0, document.lineCount - 1);
  for (const d of diagnostics) {
    let startLine = Math.min(Math.max(0, d.line - 1), lastLine);
    let endLine = Math.min(Math.max(0, (d.endLine ?? d.line) - 1), lastLine);
    const startChar = Math.max(0, d.col - 1);
    let endChar = Math.max(0, (d.endCol ?? d.col) - 1);
    // A zero-length range has no visible squiggle — stretch it by one column.
    if (startLine === endLine && startChar === endChar) {
      endChar = Math.min(endChar + 1, document.lineAt(startLine).text.length);
    }
    const range = new vscode.Range(startLine, startChar, endLine, endChar);
    const severity =
      d.severity === 'warning'
        ? vscode.DiagnosticSeverity.Warning
        : d.severity === 'info'
          ? vscode.DiagnosticSeverity.Information
          : vscode.DiagnosticSeverity.Error;
    const message = d.rule ? `[${d.rule}] ${d.message}` : d.message;
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = 'kolang';
    mapped.push(diagnostic);
  }
  return mapped;
}

// Spawn the linter, feed it the document text on stdin, parse the JSON result.
// On any error (spawn/parse/timeout) the diagnostics for the document are
// cleared and nothing is thrown.
function runLinter(document) {
  if (!linterConfig.enable || !diagnosticCollection) return;

  let child;
  try {
    child = spawn(linterConfig.path, [], { stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    diagnosticCollection.delete(document.uri);
    return;
  }

  let stdout = '';
  let settled = false;

  // Hard 5-second timeout: SIGKILL the child if it hangs.
  const killTimer = setTimeout(() => {
    if (!settled) child.kill('SIGKILL');
  }, 5000);

  const finish = (diags) => {
    if (settled) return;
    settled = true;
    clearTimeout(killTimer);
    diagnosticCollection.set(document.uri, diags);
  };

  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stdin.on('error', () => {
    // The child may exit before reading stdin (EPIPE) — nothing to do.
  });

  child.on('error', (err) => {
    if (err.code === 'ENOENT' && !linterWarned) {
      console.warn(`[kolang] linter binary not found: '${linterConfig.path}'. Linting disabled.`);
      linterWarned = true;
    }
    finish([]);
  });

  child.on('close', () => {
    if (child.killed) {
      finish([]); // timed out — clear diagnostics for this document
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch (err) {
      finish([]); // malformed output — clear diagnostics
      return;
    }
    finish(mapDiagnostics(document, parsed.diagnostics || []));
  });

  try {
    child.stdin.write(document.getText());
    child.stdin.end();
  } catch (err) {
    finish([]);
  }
}

function lintAllOpenDocuments() {
  for (const document of vscode.workspace.textDocuments) {
    if (isKolangDocument(document)) scheduleLint(document);
  }
}

// ---------------------------------------------------------------------------
// Feature 2: Hover provider
// ---------------------------------------------------------------------------

function registerHoverProvider() {
  const hoverLookup = buildHoverLookup(KOLANG_DOCS);
  return vscode.languages.registerHoverProvider('kolang', {
    provideHover(document, position) {
      const wordRange = document.getWordRangeAtPosition(position, WORD_REGEX);
      if (!wordRange) return null;
      const word = document.getText(wordRange);
      const entry = hoverLookup.get(word);
      if (!entry) return null;
      const md = new vscode.MarkdownString('**' + word + '** — ' + entry.detail);
      md.supportThemeIcons = true;
      md.isTrusted = false;
      return new vscode.Hover(md, wordRange);
    },
  });
}

// ---------------------------------------------------------------------------
// Feature 3: Completion provider (registration)
// ---------------------------------------------------------------------------

function registerCompletionProvider() {
  return vscode.languages.registerCompletionItemProvider(
    'kolang',
    {
      provideCompletionItems(document, position) {
        const wordRange = document.getWordRangeAtPosition(position, WORD_REGEX);
        const prefix = wordRange ? document.getText(wordRange) : '';
        const items = buildCompletionItems(document, prefix, wordRange);
        return new vscode.CompletionList(items, false); // not incomplete — full list provided
      },
      // No resolveCompletionItem: resolveProvider is effectively false.
    },
    '\u0650' // ezafe trigger character (ِ)
  );
}

// ---------------------------------------------------------------------------
// RTL auto-configuration
//
// VS Code has no per-language direction:rtl API. The extension ships
// media/rtl.css that right-aligns .kolang editors, but it must be injected
// via the "Custom CSS and JS Loader" extension (be5invis.vscode-custom-css).
// This function detects the setup state and guides the user automatically.
// ---------------------------------------------------------------------------

function checkRtlSetup(context) {
  if (rtlSetupNotified) return;
  rtlSetupNotified = true;

  const rtlCssPath = path.join(context.extensionPath, 'media', 'rtl.css');
  const fileUrl = 'file://' + rtlCssPath;

  // Check if Custom CSS Loader is installed
  const customCssExt = vscode.extensions.getExtension(CUSTOM_CSS_EXT_ID);

  if (!customCssExt) {
    // Not installed — guide the user to install it
    vscode.window
      .showInformationMessage(
        'برای راست‌چین کردن ویرایشگر کلنگ، افزونهٔ «Custom CSS and JS Loader» لازم است. نصب می‌کنید؟',
        'نصب افزونه',
        'بعداً'
      )
      .then((choice) => {
        if (choice === 'نصب افزونه') {
          // Open the extension's page in the Extensions panel
          vscode.commands.executeCommand('extension.open', CUSTOM_CSS_EXT_ID);
          vscode.window.showInformationMessage(
            'پس از نصب، VS Code را بازنشانی کنید تا پیکربندی RTL خودکار انجام شود.'
          );
        }
      });
    return;
  }

  // Custom CSS Loader is installed — check if rtl.css is configured
  const config = vscode.workspace.getConfiguration();
  const imports = config.get('vscode_custom_css.imports') || [];
  const isConfigured = imports.some(
    (url) => url === fileUrl || url === rtlCssPath
  );

  if (!isConfigured) {
    // Not configured — offer to auto-configure
    vscode.window
      .showInformationMessage(
        'افزونهٔ Custom CSS Loader نصب است اما rtl.css کلنگ پیکربندی نشده. پیکربندی خودکار؟',
        'پیکربندی خودکار',
        'بعداً'
      )
      .then((choice) => {
        if (choice === 'پیکربندی خودکار') {
          const newImports = [...imports, fileUrl];
          config
            .update(
              'vscode_custom_css.imports',
              newImports,
              vscode.ConfigurationTarget.Global
            )
            .then(
              () => {
                vscode.window
                  .showInformationMessage(
                    'RTL پیکربندی شد. اکنون فرمان «Enable Custom CSS and JS» را اجرا کنید، سپس VS Code را بازنشانی کنید.',
                    'Enable Custom CSS'
                  )
                  .then((c) => {
                    if (c === 'Enable Custom CSS') {
                      vscode.commands.executeCommand('extension.enableCustomCSS');
                    }
                  });
              },
              (err) => {
                vscode.window.showErrorMessage(
                  'خطا در پیکربندی RTL: ' + err.message
                );
              }
            );
        }
      });
    return;
  }

  // Already configured — stay silent (user has been guided before)
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Command: insert RLM (Right-to-Left Mark, U+200E) at cursor.
  // A power-user affordance for fixing bidi ordering in mixed-direction lines.
  const insertRlm = vscode.commands.registerCommand('kolang.insertRLM', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    await editor.edit((builder) => {
      editor.selections.forEach((sel) => {
        builder.insert(sel.active, '\u200E');
      });
    });
  });

  // Command: wrap the current selection in backticks (Kolang string literal).
  const wrapInBackticks = vscode.commands.registerCommand('kolang.wrapInBackticks', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    await editor.edit((builder) => {
      editor.selections.forEach((sel) => {
        if (sel.isEmpty) {
          // Insert an empty backtick pair and place cursor inside.
          builder.insert(sel.active, '``');
        } else {
          const text = editor.document.getText(sel);
          builder.replace(sel, '`' + text + '`');
        }
      });
    });
    // If we inserted an empty pair, move cursor one left (between the backticks).
    if (editor.selections.every((s) => s.isEmpty)) {
      const pos = editor.selection.active;
      editor.selection = new vscode.Selection(pos.translate(0, -1), pos.translate(0, -1));
    }
  });

  context.subscriptions.push(insertRlm, wrapInBackticks);

  // --- Linter ---
  linterConfig = getLinterConfig();
  diagnosticCollection = vscode.languages.createDiagnosticCollection('kolang');
  context.subscriptions.push(diagnosticCollection);

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isKolangDocument(document)) scheduleLint(document);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isKolangDocument(event.document)) scheduleLint(event.document);
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      const key = document.uri.toString();
      const timer = linterTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        linterTimers.delete(key);
      }
      diagnosticCollection.delete(document.uri);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('kolang.linter')) return;
      linterConfig = getLinterConfig();
      if (linterConfig.enable) {
        lintAllOpenDocuments();
      } else {
        clearAllLinterTimers();
        diagnosticCollection.clear();
      }
    })
  );

  // Lint all open .kolang documents on activation.
  lintAllOpenDocuments();

  // --- Hover provider ---
  context.subscriptions.push(registerHoverProvider());

  // --- Completion provider ---
  context.subscriptions.push(registerCompletionProvider());

  // Check RTL custom CSS setup (guides user to install + configure Custom CSS Loader)
  checkRtlSetup(context);
}

function deactivate() {
  // Flush any pending debounce timers.
  for (const timer of linterTimers.values()) {
    clearTimeout(timer);
  }
  linterTimers.clear();
  // Allow the RTL setup notification to be shown again next session.
  rtlSetupNotified = false;
  return undefined;
}

module.exports = { activate, deactivate };