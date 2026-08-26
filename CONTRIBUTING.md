# مشارکت در kolang-vscode

از مشارکت شما در توسعهٔ افزونهٔ کلنگ برای VS Code سپاسگزاریم! هر مشارکتی — کوچک یا
بزرگ — به بهبود این افزونه کمک می‌کند.

## راه‌اندازی توسعه

ابتدا مخزن را هم‌آوا (clone) کنید:

```bash
git clone https://github.com/faralidev/kolang-vscode
cd kolang-vscode
```

سپس وابستگی‌ها را نصب کنید:

```bash
npm install
```

## تست محلی

در VS Code کلید `F5` را بفشارید تا یک **پنجرهٔ توسعهٔ افزونه (Extension Development
Host)** با افزونهٔ بارگذاری‌شده باز شود. یک فایل با پسوند `.kolang` بسازید یا باز
کنید تا برجسته‌سازی نحو، تکمیل خودکار، مستندات شناور و لینتر را آزمایش کنید.

برای اجرای دستی لینتر (در صورت نبودن در `PATH`)، مسیر باینری `kolang-linter` را در
تنظیم `kolang.linter.path` مشخص کنید.

## بسته‌بندی افزونه

برای تولید فایل `.vsix`:

```bash
npm run package
```

خروجی، فایل `kolang-0.0.1.vsix` خواهد بود. برای نصب محلی:

```bash
code --install-extension kolang-0.0.1.vsix
```

## ساختار پروژه

افزونه یک ماژول CommonJS واحد به‌همراه دارایی‌های ایستا است:

```
extension.js                        منطق اصلی: لینتر، مستندات شناور، تکمیل و فرمان‌ها
data/kolang-docs.json               دادهٔ کلیدواژه‌ها، توابع builtin و انواع
syntaxes/kolang.tmLanguage.json     گرامر TextMate
snippets/kolang.json                تعریف قطعه‌کدهای VS Code
themes/kolang-dark.json             پوستهٔ تیره (Catppuccin Mocha)
themes/kolang-light.json            پوستهٔ روشن (Catppuccin Latte)
language-configuration.json         جفت‌شدن پرانتزها، بسته‌شدن خودکار، تورفتگی
media/rtl.css                       CSS اختیاری برای نمایش درست RTL در workbench
```

### منبع دادهٔ مستندات

دادهٔ `data/kolang-docs.json` — کلیدواژه‌ها، توابع builtin و انواع — از مخزن
[`kolang-data`](https://github.com/faralidev/kolang-data) همگام‌سازی می‌شود که
منبع حقیقی مستندات زبان کلنگ است. اگر این داده‌ها در `kolang-data` تغییر کرد، این
فایل را نیز همگام‌سازی کنید.

### لینتر

افزونه از طریق فراخوانی باینری خارجی
[`kolang-linter`](https://github.com/faralidev/kolang-linter) (یک پروژهٔ جداگانه
به زبان Go) کار می‌کند. این باینری **به‌همراه افزونه بسته‌بندی نمی‌شود** و کاربر باید
آن را جداگانه نصب کند. قرارداد رابط به این صورت است: متن منبع از stdin خوانده می‌شود
و JSON به شکل
`{"diagnostics":[{"line","col","endLine","endCol","severity","message","rule"}]}`
روی stdout نوشته می‌شود (مختصات یک‌پایه).

## فرایند ارسال مشارکت

1. مخزن را fork کنید و یک شاخه بسازید:
   `git checkout -b my-feature`.
2. تغییر خود را اعمال کنید. لطفاً `extension.js` را به‌صورت CommonJS نگه دارید
   (بدون ESM یا TypeScript).
3. اگر گرامر یا پوسته‌ها را تغییر دادید، درستی JSON آن‌ها را بررسی کنید.
4. تغییرات خود را در `CHANGELOG.md` زیر بخش `[Unreleased]` ثبت کنید.
5. یک pull request با توضیح روشن باز کنید و در صورت وجود، به مسائل مرتبط پیوند دهید.

## سبک کد

- `extension.js` به‌صورت CommonJS ساده نوشته می‌شود — بدون مرحلهٔ build و بدون
  ترجمه (transpile).
- برای جدا کردن بخش‌ها از توضیحِ بخش (comment) با الگوی `// --- Section ---`
  استفاده می‌شود.
- در متن‌های فارسی از نیم‌فاصلهٔ واقعی (U+200C) استفاده کنید، نه خط تیرهٔ ASCII.
- در متون کاربرپسند، لحن دوزبانهٔ فعلی (فارسی و انگلیسی) حفظ شود.

## پروانه

با مشارکت در این پروژه می‌پذیرید که مشارکت شما تحت پروانهٔ MIT منتشر شود. برای
جزئیات [LICENSE](LICENSE) را ببینید.

از اینکه به توسعهٔ کلنگ کمک می‌کنید سپاسگزاریم!