# Analytics for Statgap.gg

## Recommendation

For a small, privacy-conscious site like Statgap, we recommend one of:

### 1. **Vercel Analytics** (simplest if you're on Vercel)
- Already in the project (Speed Insights). Add **Vercel Analytics** in the dashboard for pageviews.
- Cookie-free, minimal setup, no consent banner needed in most jurisdictions.
- Limited to pageviews and basic metrics.

### 2. **Plausible** (best balance: privacy + useful stats)
- Cookie-free, GDPR-friendly, no consent banner typically required.
- EU-only hosting option, ~1KB script, clear dashboard (pageviews, referrers, countries, devices).
- Paid (e.g. €9/mo). Add script to `app/layout.tsx` with their snippet.

### 3. **Google Analytics 4**
- Free and full-featured, but uses cookies and sends data to Google.
- In the EU and other strict regions you **must** get consent before loading GA (cookie banner).
- Only choose if you need deep Google integration or don’t mind adding a consent solution.

## Implementation notes

- **Cookies vs localStorage:** We use **localStorage** for favorites and recent searches (no cookie banner needed for that). If you add GA or another cookie-based analytics, update the Privacy Policy and consider a simple consent banner (e.g. “Accept” / “Reject”) before loading the analytics script.
