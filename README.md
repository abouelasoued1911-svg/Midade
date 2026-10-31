# مِداد | MIDADE — Spaced Repetition Flashcards (PWA)

[![Deploy to GitHub Pages](https://github.com/actions/workflows/deploy.yml/badge.svg)](https://github.com)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6.svg)](https://www.typescriptlang.org)
[![Vite 8](https://img.shields.io/badge/Vite-8.3-646cff.svg)](https://vitejs.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-success.svg)](https://web.dev/progressive-web-apps/)

**MIDADE (مِداد)** is a modern, high-performance, 100% free spaced repetition flashcard application inspired by Anki and AnkiDroid. It empowers learners to memorize anything permanently with the proven **SM-2 Spaced Repetition Algorithm**, seamless cross-device synchronization with **Firebase**, full offline functionality with **IndexedDB**, and direct import of official **Anki packages (.apkg)** using **SQLite WebAssembly**.

---

## 🌟 Key Features

1. **SM-2 Spaced Repetition Algorithm**:
   - Scientific scheduling: *Again (1)*, *Hard (2)*, *Good (3)*, and *Easy (4)*.
   - Dynamic Ease Factor, repetition counting, intervals, and lapses.
   - Comprehensive card types: **Basic** (Front/Back), **Cloze Deletions** (`{{c1::word}}`), and **Type-in** spelling tests.

2. **Official Anki (.apkg) Package Importer**:
   - In-browser SQLite WebAssembly (`sql-wasm.wasm`) engine.
   - Unpacks decks, subdecks, card tags, and media assets (images, audio).
   - Works offline with memory boundaries protecting mobile devices.

3. **Enterprise-Grade Cloud Synchronization**:
   - Bi-directional sync with Firebase Firestore on the 100% free Spark plan.
   - Chunked batch processing (up to 400 items per batch) supporting 50, 400, or 1000+ items without truncation.
   - Reliable deletion synchronization via **Tombstones** preventing resurrected cards.
   - Smart conflict resolution prioritizing the latest update timestamp (`updatedAt`).

4. **Multi-User Data Isolation**:
   - Isolated local partitions per Google account on the same device.
   - Clean session logout without destroying saved offline data.

5. **RFC 4180 Standard CSV / TSV Import & Export**:
   - Supports quotes, embedded commas, newlines within cells, and full UTF-8 Arabic text.
   - Version 2 full JSON backup and restore with complete review histories.

6. **Progressive Web App (PWA) & Offline-First**:
   - Installable on Android, iOS, Windows, macOS, and Linux.
   - Service worker caching for offline study without internet access.
   - High-DPI PNG and SVG icons with maskable support.

7. **Multilingual & RTL Support**:
   - 11 languages: Arabic, English, Thai, French, Spanish, German, Portuguese, Japanese, Chinese, Russian, Turkish.
   - Automatic Arabic font loading (Cairo) with native Right-to-Left (RTL) layout.

8. **Security & Accessibility Hardened**:
   - DOMPurify HTML sanitization eliminating XSS vulnerabilities.
   - Secure Firestore rules restricting all data access strictly to document owners.
   - Fully zoomable viewport with WCAG-compliant touch targets.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or v22 LTS
- `npm` (packaged with Node.js)

### Installation
```bash
# 1. Clone repository or extract the project files
cd midade

# 2. Install dependencies cleanly
npm install

# 3. Start local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quality Verification & Tests
```bash
# Run TypeScript static analysis
npm run typecheck

# Run unit and integration tests (37 tests)
npm test

# Build production bundle
npm run build
```

---

## 🌐 Free Deployment (Step-by-Step)

MIDADE is a static single-page application that can be hosted for **$0 forever** on any modern static hosting provider.

### 1. GitHub Pages (Automated via GitHub Actions)
1. Push your repository to GitHub.
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, choose **GitHub Actions**.
4. The workflow at `.github/workflows/deploy.yml` will automatically run tests, build the application with a relative base path, and deploy it to `https://<username>.github.io/<repo>/`.
5. `public/404.html` ensures client-side routing works on page refresh.

### 2. Cloudflare Pages
1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
2. Click **Create Application** > **Pages** > **Connect to Git**.
3. Set **Build command**: `npm run build`.
4. Set **Build output directory**: `dist`.
5. Click **Save and Deploy**. Cloudflare automatically respects `public/_redirects`.

### 3. Netlify
1. Connect your GitHub repository in the [Netlify Dashboard](https://app.netlify.com/).
2. Set **Build command**: `npm run build`.
3. Set **Publish directory**: `dist`.
4. Click **Deploy Site**. Netlify automatically uses `public/_redirects` for SPA rewrites.

### 4. Vercel
1. Import your project in the [Vercel Dashboard](https://vercel.com/).
2. Vercel automatically detects Vite.
3. The included `vercel.json` configures SPA rewrites and WASM MIME types.
4. Click **Deploy**.

### 5. Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`.
2. Login: `firebase login`.
3. Build the application: `npm run build`.
4. Deploy: `firebase deploy --only hosting`. The included `firebase.json` serves the `dist/` folder with proper caching headers.

---

## 🔒 Firebase Configuration & Security

To enable cloud synchronization:
1. Follow the step-by-step instructions in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).
2. Deploy the included Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Update `firebase-applet-config.json` with your Firebase project credentials.
4. Add your hosting domain to **Authorized Domains** in the Firebase Authentication settings.

---

## 📖 دليل البدء السريع باللغة العربية (Arabic Guide)

### ما هو تطبيق مِداد (MIDADE)؟
**مِداد** هو تطبيق بطاقات استذكار تعليمي متقدم يعتمد على خوارزمية **التكرار المتباعد (SM-2)** لمساعدتك على حفظ أي لغة أو مادة دراسية إلى الأبد دون نسيان، مع مزامنة سحابية مجانية ودعم كامل للعمل بدون إنترنت.

### أهم المميزات:
1. **دراسة ذكية (SM-2)**: جدولة تلقائية ذكية لمراجعة البطاقات قبل أن تنساها بوقت وجيز.
2. **استيراد حزم Anki (.apkg)**: استيراد ملفات Anki الرسمية بالصور والصوت عبر محرك SQLite WebAssembly داخل المتصفح.
3. **مزامنة سحابية مجانية**: تسجيل الدخول بحساب Google لمزامنة رزمك وبطاقاتك وسجل دراستك بين كافة أجهزتك مجاناً 100%.
4. **تطبيق هاتف PWA**: يمكن تثبيته بنقرة واحدة كتطبيق أصلي على هواتف Android و iPhone وأجهزة الكمبيوتر.
5. **عزل خصوصية الحسابات**: كل حساب Google له مساحته المستقلة المعزولة تماماً على نفس الجهاز.
6. **نسخ احتياطي واستعادة**: تصدير واستيراد البيانات بصيغة JSON أو ملفات جداول CSV/TSV القياسية مع دعم كامل للغة العربية.
7. **واجهة باللغة العربية**: دعم كامل لاتجاه اليمين إلى اليسار (RTL) وخط القاهرة (Cairo) الجميل، بالإضافة إلى 10 لغات عالمية أخرى.

### خطوات النشر المجاني في دقيقة:
1. قم برفع المشروع إلى حسابك في **GitHub**.
2. ادخل على **Settings** ثم **Pages** واختر المصدر: **GitHub Actions**.
3. سيتولى النظام بناء المشروع واختباره ونشره تلقائياً على رابط مجاني مدى الحياة!
4. لتفعيل المزامنة السحابية عبر حساب Google، راجع دليل [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

---

## 📄 License
This project is licensed under the [Apache 2.0 License](LICENSE).
