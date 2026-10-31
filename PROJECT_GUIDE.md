# دليل المطور والمعمارية التقنية لمشروع MIDADE

هذا الملف مخصص لمساعدة المطورين والمساعدين البرمجيين (AI Coding Assistants) على فهم الهيكل البرمجي لمشروع MIDADE وتطويره مستقبلاً دون إحداث أي فوضى أو كسر في الوظائف.

---

## 📁 هيكلية المجلدات والملفات

```text
├── .github/
│   └── workflows/
│       └── deploy.yml              # خط أنابيب CI/CD التلقائي لـ GitHub Pages
├── public/
│   ├── assets/aistudio/            # أيقونات التطبيق والهوية البصرية
│   ├── sql-wasm.wasm               # مكتبة SQLite WASM المحلية لفك .apkg دون إنترنت
│   ├── 404.html                    # إعادة توجيه الـ SPA لـ GitHub Pages
│   └── _redirects                  # قواعد إعادة التوجيه لـ Netlify و Cloudflare Pages
├── src/
│   ├── components/                 # مكونات واجهة المستخدم التفاعلية (React)
│   │   ├── CardBrowser.tsx         # متصفح وباحث البطاقات
│   │   ├── CardEditorModal.tsx     # محرر البطاقات (Basic, Cloze, Type-In)
│   │   ├── ConfirmModal.tsx        # حوارات التأكيد غير المعطلة للواجهة
│   │   ├── DeckList.tsx            # قائمة الرزم مع عدادات البطاقات الحية
│   │   ├── DeckModal.tsx           # نافذة إنشاء وتعديل الرزم
│   │   ├── Header.tsx              # الشريط العلوي وأزرار المزامنة والمظهر
│   │   ├── ImportExportModal.tsx   # نافذة استيراد .apkg و JSON والتصدير
│   │   ├── LanguageSelectorModal.tsx# محدد اللغات الـ 11
│   │   ├── NavigationDrawer.tsx    # القائمة الجانبية للتطبيق
│   │   ├── PWAInstallButton.tsx    # زر تثبيت التطبيق على الهواتف والأجهزة
│   │   ├── StatsModal.tsx          # إحصائيات المذاكرة والرسوم البيانية
│   │   ├── StudyView.tsx           # شاشة المذاكرة وتكرار البطاقات وتكامل النطق
│   │   └── SyncModal.tsx           # تفاصيل وحالة المزامنة السحابية
│   ├── i18n/
│   │   ├── context.tsx             # سياق إدارة اللغة والاتجاه (RTL/LTR)
│   │   └── translations.ts         # قواميس الترجمة لـ 11 لغة عالمية
│   ├── services/
│   │   ├── ankiAlgorithm.ts        # خوارزمية SM-2 وتحديد الفترات الزمنية
│   │   ├── apkgParser.ts           # محرك فك حزم Anki (.apkg) عبر SQLite WASM
│   │   ├── cloudSync.ts            # محرك المزامنة السحابية ونظام الشواهد (Tombstones)
│   │   ├── indexedDb.ts            # مخزن IndexedDB للوسائط والبيانات الضخمة
│   │   ├── starterDecks.ts         # البيانات الأولية الافتراضية
│   │   ├── storage.ts              # واجهة التخزين الموحدة (LocalStorage + IndexedDB)
│   │   └── tts.ts                  # خدمة النطق الصوتي متعدد اللغات (Web Speech API)
│   ├── utils/
│   │   └── sanitizeHtml.ts         # تطهير أكواد HTML وحماية من XSS عبر DOMPurify
│   ├── firebase.ts                 # تهيئة وتكوين Firebase Client
│   ├── types.ts                    # تعريفات TypeScript ونماذج البيانات
│   ├── App.tsx                     # المكون الجذري وإدارة الحالة الرئيسية
│   └── main.tsx                    # نقطة الانطلاق
├── firebase-applet-config.json     # معرفات واتصال مشروع Firebase
├── firebase.json                   # إعدادات الاستضافة وقواعد Firestore
├── firestore.rules                 # قواعد الحماية الصارمة لقاعدة البيانات
├── vercel.json                     # إعدادات النشر على Vercel
├── vite.config.ts                  # إعدادات Vite ومكون PWA
└── package.json                    # حزم المشروع والسكربتات
```

---

## 🧠 النظم الهندسية الأساسية

### 1. خوارزمية SM-2 (ankiAlgorithm.ts)
- **الحالات (States)**:
  - `new`: بطاقة جديدة لم تُدرس بعد.
  - `learning`: بطاقة قيد التعلم بالخطوات (1 دقيقة -> 10 دقائق).
  - `review`: بطاقة في مرحلة المراجعة طويلة الأمد بفواصل بالأيام.
  - `relearning`: بطاقة تم نسيانها وعادت لمرحلة التعلم (Lapse).
- **التقييمات (Ratings)**:
  - `1 - Again`: إعادة الخطوة، زيادة `lapses`، تخفيض `easeFactor` بمقدار 0.20.
  - `2 - Hard`: فاصل أقصر، تخفيض `easeFactor` بمقدار 0.15.
  - `3 - Good`: الفاصل الطبيعي (مضروباً في `easeFactor`).
  - `4 - Easy`: فاصل إضافي (مكافأة سهولة)، زيادة `easeFactor` بمقدار 0.15.

### 2. محرك فك .apkg المحلي (apkgParser.ts)
- يستخدم `JSZip` لفك حزمة `.apkg` المضغوطة بالكامل داخل المتصفح.
- يستخرج ملف `collection.anki2` أو `collection.anki21` ويقوم بتحميله في قاعدة بيانات SQLite داخل المتصفح عبر WebAssembly (`sql-wasm.wasm`).
- يحلل جداول `decks` و `col` و `notes` و `cards` ويحولها إلى كائنات متوافقة مع نمط بطاقات ورزم MIDADE.

### 3. نظام شواهد الحذف للمزامنة (Tombstones System)
- عند حذف أي بطاقة أو رزمة، يُسجل شاهد حذف `{ id, type, userId, deletedAt }` في المخزن المحلي.
- عند تشغيل المزامنة السحابية:
  1. تُجمع شواهد الحذف من كلا الطرفين (المحلي والسحابي).
  2. يُحذف العنصر نهائياً من Firestore باستخدام `batch.delete()`.
  3. تُحذف أي نسخة محلية من الرزم والبطاقات المطابقة للشاهد، مما يمنع نهائياً إعادة ظهور البطاقات المحذوفة عبر أجهزة متعددة.
- يتم تنظيف شواهد الحذف التي تجاوز عمرها 90 يوماً تلقائياً.

### 4. التخزين الهجين (IndexedDB + LocalStorage)
- يوفر `storage.ts` واجهة متزامنة لضمان استجابة الواجهة فورياً عند الإقلاع دون انتظار وعود غير متزامنة.
- يُزامن مع `IndexedDB` في الخلفية لضمان عدم تجاوز سعة 5MB الخاصة بـ LocalStorage عند استيراد رزم ضخمة تحتوي على صور وملفات وسائط.

---

## 🔒 إرشادات أمنية عند التعديل
1. لا تقم بتضمين أي مفاتيح ذكاء اصطناعي أو خدمات مدفوعة.
2. عند إضافة أي عنصر جديد للواجهة يعرض مدخلات البطاقات، استخدم دائماً `sanitizeCardHtml` أو `renderQuestionCloze` من `src/utils/sanitizeHtml.ts`.
3. حافظ على حجم دفعات Firestore أقل من 400 عملية كتابة لكل دفعة (Firestore Limit: 500).
