# 📱 LoanTrack — Advanced Loan & EMI Tracker PWA

A beautiful, offline-first Progressive Web App for tracking all your loans and EMIs.
Inspired by Apple Wallet · iOS design · Glassmorphism aesthetic.

---

## 🗂 File Structure

```
loantrack/
├── index.html          ← Main app shell
├── styles.css          ← All styles (themes, glass, animations)
├── script.js           ← App logic (state, render, storage)
├── manifest.json       ← PWA manifest
├── service-worker.js   ← Offline caching
├── generate_icons.py   ← Icon generator script (run once)
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## 🚀 Quick Start

### Option A — GitHub Pages (Free, Easiest)

1. Create a free account at [github.com](https://github.com)
2. Click **New repository** → name it `loantrack`
3. Upload ALL files (including the `icons/` folder)
4. Go to **Settings → Pages → Source → main branch → / (root)**
5. Your app will be live at: `https://YOUR_USERNAME.github.io/loantrack/`

### Option B — Netlify (Free, Even Easier)

1. Go to [netlify.com](https://netlify.com) and sign up free
2. Drag and drop your entire `loantrack/` folder onto the Netlify dashboard
3. Your app is instantly live at a `*.netlify.app` URL
4. You can set a custom domain for free

### Option C — Local Testing

If you have Python 3 installed:
```bash
cd loantrack/
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

> ⚠️ **Do NOT open index.html directly** as a file (file://) — PWA features require HTTP/HTTPS.

---

## 📱 How to Install on iPhone (Add to Home Screen)

After hosting online (GitHub Pages or Netlify):

1. **Open Safari** on your iPhone (must be Safari, not Chrome)
2. Navigate to your hosted URL
3. Wait for the app to fully load
4. Tap the **Share button** (the box with an arrow pointing up ↑)
5. Scroll down in the share sheet and tap **"Add to Home Screen"**
6. Change the name if you like (default: LoanTrack)
7. Tap **"Add"** in the top right corner
8. The app icon will appear on your home screen!

### After installing:
- Open it from your home screen — it will launch in **fullscreen** (no Safari bars)
- It works **completely offline** after the first load
- Your data is saved locally on your device

---

## ✨ Features

### Loan Management
- ➕ Add unlimited loans
- 🏦 Bank/Provider name, Loan Type, Amount, EMI, Rate, Tenure
- 📅 Start date, Notes, Nickname
- ✏️ Edit any field anytime
- 🗑️ Delete loans

### Loan Types Supported
- Personal Loan
- Credit Card EMI
- Debit Card EMI
- Consumer Loan
- Vehicle Loan
- Other

### Dashboard
- Total active loans
- Total borrowed / paid / pending
- Upcoming EMI due banner
- 6-month payment bar chart
- EMI stats (completed / remaining / monthly)
- Quick loan cards with progress bars

### Monthly EMI Tracking
- Mark each month as: **Paid ✅ / Missed ❌ / Partial 🔶 / Pending ⏳**
- Add payment amount and date per month
- Add notes to each payment
- Full payment history timeline per loan
- Visual grid of all EMI months

### Calculations (Auto)
- Remaining principal
- Total repayment
- Total interest payable
- EMI progress percentage
- Loan completion estimates

### Advanced
- 🔍 Search loans by name/type
- 🔽 Filter by loan type
- ↕️ Sort by date / pending amount / progress
- 💾 Backup all data as JSON
- 📂 Restore from JSON backup
- 📊 Export monthly summary as text
- 🎉 Celebration animation when a loan completes

### Appearance
- 6 beautiful themes:
  - 🌑 Midnight Blue
  - 🌿 Emerald Green
  - 💜 Purple Neon
  - ⚫ Matte Black
  - 🌹 Rose Gold
  - 🌊 Ocean Cyan
- Custom accent color picker
- Custom currency symbol

---

## 🎨 Themes

| Theme | Colors |
|-------|--------|
| Midnight Blue | Deep navy + blue accents |
| Emerald Green | Dark forest + green accents |
| Purple Neon | Dark violet + purple accents |
| Matte Black | Pure dark + neutral accents |
| Rose Gold | Dark burgundy + pink accents |
| Ocean Cyan | Deep ocean + cyan accents |

---

## 🔒 Privacy

- **100% offline** — all data stays on your device
- No server, no backend, no accounts
- No analytics or tracking
- Data stored in browser `localStorage`
- Backup/restore gives you full control of your data

---

## 🛠 Customization

### Change Currency
Go to **More → Currency Symbol** and type your symbol (₹, $, £, €, ¥, etc.)

### Change Theme
Go to **More → Theme** and tap any theme card

### Change Accent Color
Go to **More → Accent Color** and pick any color

---

## 🐛 Troubleshooting

**"Add to Home Screen" not showing?**
→ Must use Safari on iPhone. Other browsers on iOS don't support PWA install.

**App not working offline?**
→ Must be loaded once over HTTPS first so the service worker can cache files.

**Data lost?**
→ Always use Backup (More → Backup Data) regularly. localStorage can be cleared by iOS if storage is low.

**Chart not showing?**
→ Add some loans and mark payments — chart shows last 6 months of activity.

**Icons look blurry?**
→ Re-run `python3 generate_icons.py` or replace `icons/` with higher-quality PNGs.

---

## 📦 Regenerating Icons

If you want custom icons:

```bash
# Install Pillow
pip3 install Pillow

# Generate icons
python3 generate_icons.py
```

Or replace icons manually with your own PNGs at the required sizes.

---

## 🌐 Hosting Checklist

Before deploying, make sure:
- [ ] All files uploaded (index.html, styles.css, script.js, manifest.json, service-worker.js)
- [ ] `icons/` folder with all PNG sizes uploaded
- [ ] Hosted over **HTTPS** (GitHub Pages and Netlify do this automatically)
- [ ] `manifest.json` — `start_url` matches your actual URL path
- [ ] Test in Chrome DevTools → Application → Manifest before installing on iPhone

---

## 🙌 Credits

Built with pure HTML, CSS, and JavaScript. No frameworks. No dependencies.
All code is open and fully customizable.

---

*LoanTrack v1.0 — Made with ❤️ for iPhone users who want a beautiful loan tracker*
