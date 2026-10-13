# ATS Checker — Chrome Extension (Browser Sidecar)

The **ATS Checker Chrome Extension** is an in-browser sidecar that analyzes job descriptions directly on job boards (**LinkedIn, Indeed, Greenhouse, Lever, Ashby, Workday**) and matches them against your parsed resume in real time.

---

## 🚀 Key Features

1. **0-Click Seamless Auth Pairing**:
   - Simply sign in to the ATS Checker web platform (`localhost:3000` or production domain).
   - The extension's web bridge automatically synchronizes your account and active resume without needing to copy-paste tokens or emails.

2. **Draggable Floating Pill Badge**:
   - Displays real-time ATS compatibility (e.g. `84% Strong Fit`) at your preferred spot on the screen.
   - Smoothly drag and drop the pill anywhere on your screen — your preferred position is saved across tabs.

3. **In-Page Keyword X-Ray Highlighting**:
   - Toggle **👁️ X-Ray** in the drawer to highlight matching keywords in **emerald green** and missing required skills in **warm amber** directly inside the job board posting DOM.
   - Non-destructive and reversible at any time.

4. **1-Click Job Application Tracker (Synced to Neon DB)**:
   - Save job postings with 1 click directly from the sidecar drawer into your database.
   - Track application stages (`Wishlist`, `Applied`, `Interviewing`, `Offer`, `Rejected`).
   - View, filter, and manage your full application pipeline on the ATS Checker web dashboard (`/profile`).

5. **Sub-Second Rule Matching & 24h Caching**:
   - Re-visiting previously analyzed job postings loads in **0ms** from local cache.
   - Automatic vendor detection & quirks advice for **Greenhouse, Lever, Workday, Ashby, Taleo, and iCIMS**.

6. **1-Click AI Resume Tailoring (Groq LLM)**:
   - Generates 2 role-specific high-impact resume bullets tailored to the target JD's requirements with 1 click.
   - One-click copy directly into your clipboard.

7. **Shadow DOM Isolation**:
   - Sidecar drawer and pill are rendered inside a closed Shadow Root to completely isolate styles from host page CSS.

8. **Keyboard Shortcut**:
   - Press **`Cmd + Shift + A`** (Mac) or **`Ctrl + Shift + A`** (Windows / Linux) to toggle the sidecar drawer instantly on any job tab.

---

## 🛠️ How to Install in Chrome (1-Minute Setup)

1. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `extension/` folder in this repository:
   ```
   /Users/vishupratap/Movies/ats-checker/extension
   ```
5. The ATS Checker icon will now appear in your Chrome toolbar.

---

## 📖 How to Use

1. **Sign In**:
   - Open the web app at `http://localhost:3000` and sign in.
   - The extension will automatically pair your account and load your active resume.
2. **Browse Job Boards**:
   - Navigate to any job posting on:
     - LinkedIn (`linkedin.com/jobs/...`)
     - Indeed (`indeed.com/viewjob...`)
     - Greenhouse (`boards.greenhouse.io/...`)
     - Lever (`jobs.lever.co/...`)
     - Ashby (`jobs.ashbyhq.com/...`)
     - Workday (`*.myworkdayjobs.com/...`)
3. **Instant Analysis & Actions**:
   - Look for the floating score badge on the screen or press `Cmd+Shift+A` (`Ctrl+Shift+A`).
   - Click **Save Job** to log the posting into your pipeline.
   - Toggle **👁️ X-Ray** to see which skills are present or missing in the job text.
   - Click **✨ Generate 2 Tailored Bullets** for instant AI bullets ready for your application.
   - View all your saved jobs and stats in the web app under `/profile`.
