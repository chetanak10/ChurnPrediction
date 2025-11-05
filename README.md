
# ChurnShield — Student Retention Frontend (Demo)

A lightweight, static, teacher‑friendly dashboard for early dropout prediction, curriculum adaptation, and low‑cost interventions. Designed for underserved contexts: no server required for demo — data lives in the browser.

## Quick Start (Local)
- Unzip and open `index.html` in a modern browser.
- Login with any email; password: `demo123`.

## Deploy on GitHub Pages
1. Create a GitHub repo and upload all files at the root.
2. Settings → Pages → Source: **Deploy from a branch**; Branch: **main**; Folder: **/**.
3. Visit the published URL and sign in (password `demo123`).

## Notes
- This is **frontend-only**. Replace the mock data and heuristics in `assets/js/data.js` with API calls to your backend ML services.
- For real deployments, add authentication, TLS, RBAC, and audit logs.
