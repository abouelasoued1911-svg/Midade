# إعداد Firebase والمصادقة (Firebase & Google Auth Setup Guide)

يوضح هذا الدليل الخطوات البسيطة والمجانية 100% لإعداد وتفعيل المزامنة السحابية عبر Firebase Spark Plan دون الحاجة لبطاقة ائتمان أو أي تكاليف مادية.

---

## 1. إنشاء مشروع Firebase مجاني (Spark Plan)
1. افتح [Firebase Console](https://console.firebase.google.com/).
2. اضغط على **Add project** (إضافة مشروع).
3. اختر اسم المشروع (مثلاً: `midade-flashcards`).
4. عطل Google Analytics إذا لم تكن بحاجة إليها، ثم اضغط **Create project**.
5. تأكد من أن خطة المشروع هي **Spark (Free $0/month)**.

---

## 2. تفعيل تسجيل الدخول بواسطة Google (Google Authentication)
1. من القائمة الجانبية في Firebase Console، انتقل إلى **Build** ثم **Authentication**.
2. اضغط على **Get Started**.
3. في تبويب **Sign-in method**، اختر **Google**.
4. فعّل المفتاح **Enable**.
5. حدد بريد الدعم الخاص بالمشروع (Project support email).
6. اضغط **Save**.

---

## 3. إضافة النطاقات المعتمدة (Authorized Domains)
إذا كنت تستضيف التطبيق على GitHub Pages أو Cloudflare Pages أو Netlify:
1. في صفحة **Authentication**، اذهب إلى تبويب **Settings**.
2. اختر **Authorized domains** (النطاقات المعتمدة).
3. اضغط **Add domain** وأضف:
   - لـ GitHub Pages: `<your-username>.github.io`
   - لـ Cloudflare Pages: `<your-project>.pages.dev`
   - لـ Netlify: `<your-site-name>.netlify.app`
   - لـ Vercel: `<your-project>.vercel.app`
   - للاختبار المحلي: `localhost` موجود تلقائياً.

---

## 4. تفعيل قاعدة بيانات Cloud Firestore
1. من القائمة الجانبية، انتقل إلى **Build** ثم **Firestore Database**.
2. اضغط **Create database**.
3. اختر الموقع الجغرافي الأقرب إليك (مثلاً: `europe-west1` أو `us-central1`).
4. اختر **Start in production mode**.
5. بعد الإنشاء، انتقل إلى تبويب **Rules** (القواعد).
6. انسخ محتوى الملف `firestore.rules` الموجود في المشروع والصقه بالكامل، ثم اضغط **Publish**.

القواعد المعتمدة تضمن:
- عزل بيانات كل مستخدم عزلاً تاماً.
- عدم قدرة أي مستخدم على قراءة أو تعديل رزم أو بطاقات غيره.
- منع تعديل المعرفات والتقييمات بطريقة احتيالية.
- منع الحذف الجماعي غير المصرح به.

---

## 5. ربط إعدادات التطبيق (`firebase-applet-config.json`)
1. في Firebase Console، اضغط على أيقونة الإعدادات (⚙️ Project settings).
2. في قسم **Your apps**، اضغط على أيقونة الويب `</>`.
3. اكتب اسماً للتطبيق (مثلاً: `MIDADE Web`).
4. انسخ كائن الإعدادات وضع القيم داخل `firebase-applet-config.json`:
```json
{
  "projectId": "YOUR_PROJECT_ID",
  "appId": "YOUR_APP_ID",
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
  "messagingSenderId": "YOUR_SENDER_ID"
}
```
5. احفظ الملف، وسيقوم التطبيق بالاتصال التلقائي بحسابك المجاني.
