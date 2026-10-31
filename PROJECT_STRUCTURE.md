# MIDADE - Architectural Overview & Project Structure

MIDADE is a production-grade, offline-first Spaced Repetition (SRS) Flashcard application built with modern React 19, TypeScript, Vite 8, Tailwind CSS, Firebase Firestore & Authentication, and SQLite WebAssembly for Anki (.apkg) packages.

---

## Architecture Flow

```
┌────────────────────────────────────────────────────────┐
│                   User Interface (React)               │
│  [Header] [DeckList] [StudyView] [Browser] [Modals]   │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      ┌─────────────────┐       ┌─────────────────┐
      │  I18n Provider  │       │ Error Boundary  │
      │   (11 Langs)    │       │ (Graceful Catch)│
      └─────────────────┘       └─────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
  ┌─────────────────────────┐  ┌────────────────────────┐
  │   Local Storage & IDB   │  │   Cloud Sync Engine    │
  │   - Multi-User Isolation│  │   - Chunked Batching   │
  │   - Safe Migrations     │  │   - Tombstone Deletes  │
  │   - IndexedDB Mirror    │  │   - Conflict Merging   │
  └────────────┬────────────┘  └───────────┬────────────┘
               │                           │
               ▼                           ▼
      ┌─────────────────┐         ┌─────────────────┐
      │ Browser Storage │         │ Cloud Firestore │
      │  (Offline-First)│         │ (Free Spark Plan│
      └─────────────────┘         └─────────────────┘
```

---

## Directory & File Layout

```text
├── .github/
│   └── workflows/
│       └── deploy.yml              # Automated GitHub Pages CI/CD workflow
├── public/
│   ├── assets/aistudio/            # High-resolution brand and logo assets
│   ├── apple-touch-icon.png        # iOS Home Screen app icon
│   ├── pwa-192x192.png             # Standard Android PWA icon
│   ├── pwa-512x512.png             # Splash & High-DPI icon
│   ├── pwa-maskable-512x512.png    # Android adaptive/maskable icon
│   ├── icon.svg                    # Scalable vector icon
│   ├── sql-wasm.wasm               # SQLite WebAssembly engine for .apkg files
│   ├── 404.html                    # Single Page App routing fallback for GitHub Pages
│   └── _redirects                  # Static routing rules for Cloudflare Pages & Netlify
├── src/
│   ├── components/                 # Presentation and Container UI Components
│   │   ├── CardBrowser.tsx         # Full-text search, filter & card editor browser
│   │   ├── CardEditorModal.tsx     # Rich editor (Basic, Cloze deletion, Type-in)
│   │   ├── ConfirmModal.tsx        # Non-blocking accessible confirmation dialogs
│   │   ├── DeckList.tsx            # Main deck view with daily counter badges
│   │   ├── DeckModal.tsx           # Deck creator, editor & daily review limits
│   │   ├── ErrorBoundary.tsx       # Crash prevention and graceful recovery wrapper
│   │   ├── Header.tsx              # Navigation bar, search, sync status & theme toggle
│   │   ├── ImportExportModal.tsx   # Anki (.apkg), JSON, and RFC 4180 CSV/TSV manager
│   │   ├── LanguageSelectorModal.tsx # Multi-language switcher (11 languages with RTL)
│   │   ├── NavigationDrawer.tsx    # Slide-out responsive mobile & desktop drawer
│   │   ├── PWAInstallButton.tsx    # One-click PWA installer with iOS & desktop guides
│   │   ├── StatsModal.tsx          # Spaced repetition retention, maturity & forecast
│   │   ├── StudyView.tsx           # SM-2 study view with keyboard shortcuts & TTS
│   │   └── SyncModal.tsx           # Cloud sync status & Google authentication
│   ├── hooks/
│   │   └── usePWAInstall.ts        # PWA prompt capture and device detection hook
│   ├── i18n/
│   │   ├── context.tsx             # Context provider handling dynamic RTL/LTR & fonts
│   │   └── translations.ts         # Full translations for 11 international languages
│   ├── services/
│   │   ├── ankiAlgorithm.ts        # SM-2 spaced repetition calculation engine
│   │   ├── apkgParser.ts           # Anki package unpacker with SQLite WASM
│   │   ├── cloudSync.ts            # Firestore bi-directional chunked sync & tombstones
│   │   ├── indexedDb.ts            # IndexedDB persistent engine with userId indexes
│   │   ├── starterDecks.ts         # Initial and sample decks
│   │   ├── storage.ts              # Partitioned user storage with legacy fallback
│   │   └── tts.ts                  # Multilingual Web Speech API audio helper
│   ├── utils/
│   │   ├── csvParser.ts            # RFC 4180 compliant CSV/TSV parser & formatter
│   │   ├── id.ts                   # Cryptographic UUID generator
│   │   └── sanitizeHtml.ts         # DOMPurify sanitizer with safe text entity fallback
│   ├── App.tsx                     # Main application state and view router
│   ├── firebase.ts                 # Firebase client initialization
│   ├── main.tsx                    # React root entry point
│   └── types.ts                    # TypeScript types (Deck, Card, ReviewLog, Tombstone)
├── CHANGELOG.md                    # Release history and audit report
├── CONTRIBUTING.md                 # Contribution guidelines
├── FIREBASE_SETUP.md               # Firebase & Google Login setup instructions
├── README.md                       # Main documentation & user manual
├── SECURITY.md                     # Security spec & vulnerability reporting
├── firebase-applet-config.json     # Firebase web client configuration
├── firebase.json                   # Firebase Hosting & Firestore deploy settings
├── firestore.rules                 # Hardened Firestore security rules
├── package.json                    # Project dependencies and build scripts
├── package-lock.json               # Deterministic dependency lockfile
├── tsconfig.json                   # TypeScript compiler options
├── vercel.json                     # Vercel deployment and routing configuration
└── vite.config.ts                  # Vite 8 & VitePWA configuration
```
