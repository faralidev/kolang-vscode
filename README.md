# Kolang (کلنگ) — VS Code Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.80+-007ACC.svg)](https://code.visualstudio.com/)
[![Marketplace](https://img.shields.io/badge/Marketplace-faralidev.kolang-007ACC.svg)](https://marketplace.visualstudio.com/items?itemName=faralidev.kolang)
[![GitHub](https://img.shields.io/badge/GitHub-faralidev%2Fkolang--vscode-181717.svg)](https://github.com/faralidev/kolang-vscode)

پشتیبانی کامل زبان برنامه‌نویسی **کلنگ** برای VS Code با حداکثر پشتیبانی از
نوشتن راست‌به‌چپ (RTL) و فارسی.

Full VS Code support for the **Kolang** Persian programming language, with
maximal RTL and Persian writing support.

## Features / ویژگی‌ها

- **برجسته‌سازی نحو (Syntax highlighting)** — گرامر کامل TextMate پوشش‌دهندهٔ همهٔ
  توکن‌های v10: کلیدواژه‌ها، فعل‌ها، انواع builtin، اپراتورها (`÷` `÷/` `**` `<<` `>>`
  `|>` `->` `==` `<` `>` `<=` `>=`)، اضافهٔ (ezafe `ِ` U+0650) به‌عنوان توکن جدا،
  ارقام فارسی `۰-۹` (و لاتین)، پیشوندهای `۰x`/`۰b`/`۰o`، ممیز فارسی `٫` و جداکنندهٔ
  `٬`، رشته‌های گیومه‌ای `«...»`، توضیحات خطی `/` و بلوکی `// ... //`، نام‌های استثنا
  با نیم‌فاصله (مانند `خطای‌صفر`)، و نام ماژول‌ها.
- **نمایش راست‌به‌چپ (RTL rendering)** — VS Code به‌صورت خودکار متنی که بیشترش فارسی
  است را راست‌به‌چپ نمایش می‌دهد؛ این افزونه با پیکربندی صحیح `wordPattern` و
  `wordSeparators` مرزهای واژه را برای فارسی درست می‌کند.
- **تکمیل خودکار هوشمند (Autocompletion)** — تکمیل کلیدواژه‌ها، توابع builtin، انواع،
  ماژول‌ها، استثناها، literalها و قطعه‌کدها، به‌علاوهٔ شناسه‌های تعریف‌شده در برنامهٔ
  جاری (توابع، گونه‌ها، متغیرها).
- **قطعه‌کدها (Snippets)** — قطعه‌های RTL فارسی برای `تعریف`، `گونه`، `رابط`، `اگر`،
  `برای`، `تاوقتی`، `بپا`، `با`، `برو`، `کانال`، `پوشش`، مولد، چندمقداری، و بیشتر.
- **مستندسازی شناور (Hover docs)** — نگه‌داشتن ماوس روی کلیدواژه‌ها، توابع builtin،
  انواع، ماژول‌ها و استثناها توضیح کوتاه فارسی نمایش می‌دهد. منبع حقیقیِ مستنداتِ
  کلیدواژه‌ها و توابعِ builtin، مخزن
  [kolang-data](https://github.com/faralidev/kolang-data) است.
- **لینتر (Linter)** — یکپارچه با باینری `kolang-linter`: تشخیص زندهٔ خطاهای نحوی،
  متغیرهای تعریف‌نشده و استفاده‌نشده، و قواعد سبکی. به‌صورت خودکار هنگام ویرایش اجرا
  می‌شود (با تأخیر قابل‌پیکربندی).
- **پوسته‌ها (Themes)** — دو پوستهٔ «Kolang Dark» و «Kolang Light» با رنگ‌بندی مناسب
  برای خواندن طولانی متن فارسی.
- **فرمان‌ها (Commands)**:
  - `Kolang: درج نشان راست‌به‌چپ (RLM)` — درج U+200E برای کنترل ترتیب bidi.
  - `Kolang: درون‌گیری انتخاب در بک‌تیک` — قرار دادن انتخاب در رشتهٔ بک‌تیک (ابزار
    power-user؛ یادآوری: بک‌تیک جزو نحو رشتهٔ کلنگ نیست).

## Linter / لینتر

This extension shells out to the `kolang-linter` binary — a separate Go project
hosted at [`faralidev/kolang-linter`](https://github.com/faralidev/kolang-linter).
لینتر یک پروژهٔ مجزای Go است و افزونه آن را به‌صورت یک پردازش خارجی فراخوانی می‌کند.

Install it with one of:

```bash
# macOS (Homebrew)
brew install faralidev/tap/kolang-linter

# any platform with Go installed
go install github.com/faralidev/kolang-linter@latest
```

If the binary is not found on `PATH`, linting is **silently disabled** (a single
warning is logged to the Output panel); syntax highlighting, completion, hover
docs and snippets continue to work normally.
اگر باینری پیدا نشود، لینت به‌صورت خاموش غیرفعال می‌شود و فقط یک هشدار در پنل Output
ثبت می‌گردد؛ برجسته‌سازی نحو، تکمیل و سایر ویژگی‌ها همچنان کار می‌کنند.

### Configuration / پیکربندی

| Setting | Default | Description |
|---|---|---|
| `kolang.linter.enable` | `true` | فعال/غیرفعال کردن لینتر. |
| `kolang.linter.path` | `'kolang-linter'` | مسیر باینری `kolang-linter` (یا نام آن در `PATH`). |
| `kolang.linter.delay` | `400` | تأخیر (به میلی‌ثانیه) بین آخرین ویرایش و اجرای لینتر. |

### Diagnostic rules / قواعد تشخیصی

The linter emits diagnostics under these rule names:

- `syntax-error` — خطای نحوی عمومی.
- `unclosed-string` — رشتهٔ گیومه‌ای بسته‌نشده.
- `unclosed-comment` — توضیح بلوکی بسته‌نشده.
- `no-implicit-truthiness` — استفادهٔ ضمنی از درست‌بودن مقدار (مانند `if x:` به‌جای
  `اگر x == درست باشد:`).
- `negation-no-bang-eq` — استفاده از `!=` ممنوع است؛ باید `نباشد` به‌کار رود.
- `dot-access` — استفاده از `.` برای دسترسی به اعضا ممنوع است؛ باید از اضافهٔ `ِ`
  استفاده شود.
- `line-too-long` — خط بیش از حد طولانی.
- `mixed-indentation` — ترکیب فاصله و تب در تورفتگی.
- `trailing-whitespace` — فضای خالی در انتهای خط.
- `undefined-variable` — متغیر استفاده‌شده ولی تعریف‌نشده.
- `unused-variable` — متغیر تعریف‌شده ولی استفاده‌نشده.
- `naming-convention` — نقض قرارداد نام‌گذاری.
- `duplicate-import` — وارد کردن تکراری یک ماژول.

## Installation / نصب

### From the VS Code Marketplace (recommended / پیشنهادی)

1. Open VS Code.
2. Go to the Extensions panel (`Ctrl/Cmd+Shift+X`).
3. Search for **"Kolang"** or **"کلنگ"**.
4. Click **Install**.

Or install from the command line:

```bash
code --install-extension faralidev.kolang
```

Marketplace page: <https://marketplace.visualstudio.com/items?itemName=faralidev.kolang>

### From VSIX (offline / آفلاین)

1. Build or download `kolang-0.1.2.vsix` (see Build below).
2. In VS Code: `Ctrl/Cmd+Shift+P` → **Extensions: Install from VSIX...** → select the
   `.vsix` file.
3. Reload the window when prompted.

### From source (development / توسعه)

```bash
git clone https://github.com/faralidev/kolang-vscode.git
cd kolang-vscode
npm install
npm run package
# produces kolang-0.1.2.vsix
```

## Build

```bash
npm install
npm run package
```

`npm run package` first fetches fresh `data/kolang-docs.json`,
`snippets/kolang.json`, and `syntaxes/kolang.tmLanguage.json` from the
[kolang-data](https://github.com/faralidev/kolang-data) and
[kolang-grammar](https://github.com/faralidev/kolang-grammar) repositories — the
canonical sources of truth — via `scripts/fetch-data.js`, then runs `vsce package`.
The data is fetched **at build time** (the `vscode:prepublish` hook): there is
**no committed copy** in this repo, so the shipped data can never drift.
No committed copy = no drift.

The fetch script reads from sibling clones (`../kolang-data/`,
`../kolang-grammar/`) when available (local dev) and falls back to the
`raw.githubusercontent.com` URLs (CI / production). To fetch the data manually:

```bash
npm run fetch-data
```

The result is `kolang-0.1.2.vsix`.

## Recommended user settings / تنظیمات پیشنهادی کاربر

For the best RTL + Persian editing experience, paste this into your VS Code
`settings.json` (under the `[kolang]` block):

```json
"[kolang]": {
  "editor.wordWrap": "on",
  "editor.wordSeparators": "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?«»،؛",
  "editor.fontFamily": "'Vazirmatn', 'Sahel', 'Vazir Code', monospace",
  "editor.detectIndentation": false,
  "editor.insertSpaces": true,
  "editor.tabSize": 4
}
```

### Why these settings?

- **`wordSeparators` excludes U+200C (ZWNJ / نیم‌فاصله):** Persian compound words
  like `خطای‌صفر`, `سیستم‌عامل`, `بسته‌است` stay one word for cursor motion,
  double-click selection, and Ctrl+Backspace. If ZWNJ were a separator, these
  identifiers would fragment.
- **`wordSeparators` includes U+0650 (kasra / اضافه):** Ezafe is a member-access
  operator in Kolang (`attrِ receiver`), so it must act as a word boundary — letting
  you jump between `attr` and `receiver` with Ctrl+Arrow.
- **Persian font:** Install a font with good Persian coverage, e.g. **Vazirmatn**
  (free, from <https://github.com/rastikerdar/vazirmatn>) or **Sahel**. Without one,
  VS Code falls back to a default that may render Persian poorly.
- **4-space indentation:** Kolang uses 4 spaces (not tabs).

## RTL — making lines right-aligned (important)

VS Code does **not** expose a per-language `direction: rtl` setting, and it does
**not** right-align lines even when it correctly bidi-shapes Persian text. By
default your `.kolang` file will render with Persian characters running RTL inside
each line, but with the **whole buffer left-aligned** and editing behaving LTR.

To get true RTL — right-aligned lines, right-side line numbers, RTL cursor motion
and autocomplete — this extension ships `media/rtl.css`, which you apply via the free
**Custom CSS and JS Loader** extension. This patches the workbench CSS for
`.kolang` editors only (other languages are unaffected).

### One-time setup

1. Install the **Custom CSS and JS Loader** extension
   (`be5invis.vscode-custom-css`). If the VS Code marketplace is blocked on your
   machine (SSL cert error), download the `.vsix` directly:

   ```bash
   curl -sSL -o /tmp/vscode-custom-css.vsix.gz \
     "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/be5invis/vsextensions/vscode-custom-css/latest/vspackage"
   gunzip -f /tmp/vscode-custom-css.vsix.gz
   code --install-extension /tmp/vscode-custom-css.vsix
   ```

   Then install it via **Extensions: Install from VSIX...** in the Command Palette
   if the CLI fails.

2. Add this to your `settings.json` (note: it must be a `file://` URL, not a path —
   replace the path below with wherever you cloned the repo):

   ```json
   "vscode_custom_css.imports": [
     "file:///absolute/path/to/kolang-vscode/media/rtl.css"
   ]
   ```

3. Run the command **Enable Custom CSS and JS** (`Cmd+Shift+P` → type it).

4. VS Code will warn "Your Code installation appears to be corrupt" — this is
   expected (the loader patches workbench files). Click **"Don't show again"** or
   install the "Fix VSCode Checksums" extension to silence it permanently.

5. **Reload the window** (`Cmd+Shift+P` → `Developer: Reload Window`).

After this, `.kolang` editors will be right-aligned with RTL editing. Other
languages are unaffected (the CSS targets `[data-lang-id="kolang"]` only).

### Re-enabling after a VS Code update

Every time VS Code updates, the custom CSS is wiped. Re-run **Enable Custom CSS
and JS** then reload. (The `media/rtl.css` file itself is untouched.)

### If you don't want the custom-CSS approach

You lose right-alignment (VS Code limitation), but the extension still gives you:
- Correct Persian word boundaries (ZWNJ kept inside words, ezafe as a boundary)
- Auto-closing `«»`, `// //`, and backtick strings
- Python-like indentation after `:`
- For occasional bidi glitches inside a single mixed-direction line, use the
  `Kolang: درج نشان راست‌به‌چپ (RLM)` command to insert U+200E.

## Language quick reference (v10)

| Concept | Syntax |
|---|---|
| Print | `«سلام» بنویس` |
| Variable | `سن = ۱۸` |
| If | `اگر سن == ۱۸ باشد:` |
| If-not | `اگر سن == ۵ نباشد:` (no `!=`) |
| Else | `وگرنه:` |
| For range | `برای ای از ۰ تا ۱۰:` (optional `گام ۲`) |
| For-in | `برای عنصر در فهرست:` |
| While | `تاوقتی شرط == درست باشد:` |
| Function | `تعریف جمع(خود و الف و ب):` |
| Return | `x برگردان` |
| Class | `گونه سگ:` / `گونه سگ وارث حیوان:` |
| Interface | `رابط نام:` |
| Method call | `صدادهیِ()خود` (ezafe `ِ` U+0650 before parens) |
| Attribute | `عنوانِ خود` (ezafe) |
| String | `«...»` (guillemets, single-line) |
| Line comment | `/ this is a line comment` |
| Block comment | `// this is a block comment //` |
| Exception | `بپا:` / `خطای‌صفر بگیر:` / `درنهایت:` |
| Throw | `خطا بده` |
| Goroutine | `برو کار()` |
| Channel | `ch << مقدار` (send), `x = >>ch` (recv), `ch ببند` |
| Defer | `پاک‌سازی() تأخیری` (postfix) |
| Yield | `مقدار بساز` / `یعنی بساز‌از` |
| Multiple return | `نتیجه و خطا = کاری()` |
| Logical | `همچنین` (and), `یا` (or), `X نباشد` (not) |
| Pipe | `داده |> تابع۱ |> تابع۲` |
| Decorator | `پوشش نام` |
| List comprehension | `نتیجه = [ای * ۲ برای ای در بازه(۱۰)]` |

## Contributing / مشارکت

See [CONTRIBUTING.md](CONTRIBUTING.md). باگ‌ها و پیشنهاد‌ها را در [GitHub Issues](https://github.com/faralidev/kolang-vscode/issues) گزارش کنید.

## License / پروانه

MIT — see [LICENSE](LICENSE).
