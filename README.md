# Vicom Hub — Internal Operations Dashboard

## Live Dashboard
**URL:** https://vicomanz.github.io/vicom-hub/

## Architecture
- **Google Sheet** → Equipment Register (source of truth)
- **GitHub Pages** → Dashboard (visual layer, read-only via published CSV)
- **Apps Script** → Write-back API (save changes, mark returned, new loans)
- **Cognito Forms** → Customer-facing loan request form (planned)
- **Zapier** → Automation glue — form → sheet, overdue alerts (planned)

## Google Sheet
**ID:** `1nkMtdwKhOvxEuSEMvqroZsW6QtS0N07rbMQpDnLzHB0`

### Tabs
1. **Equipment Register** — One row per demo unit, dashboard reads this
2. **Loan Log** — Historical record of all loans
3. **Licence Tracking** — Software licence expiry tracking
4. **Borrowed From Tek** — Equipment borrowed from Tektronix
5. **Salespeople** — Reference list (name, email, location)

## Apps Script Deployment

### Step 1: Open Apps Script
Open the Google Sheet → **Extensions → Apps Script**

### Step 2: Paste the Code
Delete any existing code in `Code.gs`, paste contents of `apps-script.js`

### Step 3: Deploy as Web App
**Deploy → New deployment** → Web app → Execute as: Me → Who has access: Anyone → Deploy → Copy the Web App URL

### Step 4: Update Dashboard
Edit `index.html`, find `const APPS_SCRIPT_URL = '';`, paste the URL, commit and push.

## Salespeople
| Name | Email | Location |
|------|-------|----------|
| Angus Wu | awu@vicom.com.au | SYD |
| Matthew Chantler | mchantler@vicom.com.au | MEL |
| Pia Yanes | pyanes@vicom.com.au | NZ |
| Filip | — | NZ |
| Hayden Schippers | hschippers@vicom.com.au | SYD |
| Andrew Norrie | ANorrie@vicom.com.au | QLD |
Vicom ANZ Internal Operations Hub
