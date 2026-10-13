# ATS Checker — Chrome Extension (Browser Sidecar)

The **ATS Checker Chrome Extension** is an in-browser sidecar that analyzes job descriptions directly on job boards (**LinkedIn, Indeed, Greenhouse, Lever, Ashby, Workday**) and matches them against your parsed resume in real time.

---

## Features
- **In-Page Floating Pill Badge**: Displays instant compatibility score (e.g. `82% Match · Strong Fit`) at the bottom-right of active job postings.
- **Slide-Over Sidecar Drawer**: 
  - Match Breakdown & Score Ring.
  - **Matched Skills**: Confirmed keywords from your resume.
  - **Missing Skills**: One-click copy for high-demand missing requirements.
  - **ATS Vendor Quirks Alert**: Automatic detection and specific advice for Greenhouse, Lever, Workday, Ashby, Taleo, iCIMS.
  - **1-Click AI Resume Tailoring**: Generates 2 tailored bullets matching the active JD responsibilities.
- **Shadow DOM Isolation**: Renders inside a closed Shadow Root to prevent CSS conflicts with host job board stylesheets.
- **Popup Menu**: Shows account sync status, active resume, and allows switching between multiple resumes.

---

## How to Install & Test in Chrome (1-Minute Setup)

1. Open Google Chrome and navigate to:
   ```
   chrome://extensions/
   ```
2. Enable **Developer mode** toggle in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `extension/` folder in this repository:
   ```
   /Users/vishupratap/Movies/ats-checker/extension
   ```
5. The extension icon will now appear in your Chrome toolbar!

---

## How to Use

1. **Sync Your Profile**:
   - Click the extension icon in the Chrome toolbar.
   - Enter your email address or Clerk User ID to sync your active resume from the database.
2. **Browse Job Boards**:
   - Navigate to any job posting on:
     - LinkedIn (`linkedin.com/jobs/...`)
     - Indeed (`indeed.com/viewjob...`)
     - Greenhouse (`boards.greenhouse.io/...`)
     - Lever (`jobs.lever.co/...`)
     - Ashby (`jobs.ashbyhq.com/...`)
     - Workday (`*.myworkdayjobs.com/...`)
3. **Instant Analysis**:
   - The floating badge at the bottom-right will automatically light up with your score.
   - Click the badge to slide out the match drawer and generate tailored bullets!
