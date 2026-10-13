# Swipe Hire

Companies swipe through candidate resumes and 5–15 second intro videos. Swipe right to shortlist (and unlock contact details), left to pass.

- `client/` – React (Vite) + Tailwind CSS + Framer Motion
- `server/` – Node.js + Express + MongoDB (Mongoose)

## Run locally

```bash
npm run install:all     # first time only
npm run dev             # API on :5000, website on http://localhost:5173
```

No MongoDB install is needed for development: `npm run dev` also starts a local database (`mongodb://127.0.0.1:27027/swipehire`, data in `server/.data/`) in its own process, so API restarts never touch it. Uploaded resumes and videos are stored in `server/uploads/`.

`shared/taxonomy.js` holds the skill / role / degree / city lists used by both the website (suggestions) and the server (resume auto-fill), so deploy the repo as a whole.

Payments run in **demo mode** (no real money) until Razorpay keys are added to `server/.env`.

## Configuration (`server/.env`)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string (required in production) |
| `JWT_SECRET` | Random string, at least 32 characters (required; the server will not start without it) |
| `CLIENT_URL` | Allowed frontend origin(s), comma separated |
| `FREE_SWIPES` | Free swipes for every new company (default 5) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Enables real payments |
| `RAZORPAY_WEBHOOK_SECRET` | Credits swipes even if the buyer closes the tab (webhook URL `/api/payment/webhook`) |
| `DEMO_PAYMENTS` | `true` = simulated purchases for local testing (ignored in production) |
| `ADMIN_EMAILS` | Comma-separated emails that can open `/admin` to approve GST verification |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Sends emails (notifications, OTP). Empty = emails are printed in the server console |

Plans and prices live in `server/src/config/index.js` (`PLANS`).

## How it works

**Candidate:** register → details popup (2 steps) → resume PDF → intro video (record in browser or upload) → dashboard showing views, wishlists and which companies shortlisted them.

**Company:** register → company + hiring requirements popup → swipe screen.
- Cards are ranked by match score (skills, experience, salary budget, location).
- Double-click / double-tap the resume to open it full screen; scroll the card for the video and details.
- Heart = wishlist (free). Every left/right swipe uses one credit.
- Right swipe reveals the candidate's email and phone, and notifies the candidate.
- Keyboard: ← pass, → shortlist.
- **Filters** on the swipe screen: city, experience, salary, notice period, skills (remembered per browser).
- **Pipeline**: shortlisted → contacted → interview → hired / rejected, with private notes.
- **Chat** between a company and the candidates it shortlisted.
- **Interviews**: company offers up to 3 times, candidate picks one; video interviews get a free Jitsi link and an "Add to Google Calendar" button.
- **Verified badge**: instant via work-email OTP (email domain must match the website), or GSTIN reviewed by an admin at `/admin`.
- Age and gender are collected but never shown to companies.

- **Jobs**: a company can post many jobs; each has its own swipe feed, pipeline and stats, and can be paused or closed.
- **Undo** your last swipe (within 10 minutes, before you contact the candidate); the credit is refunded.
- **Saved searches**: save swipe filters and get alerted (in-app + email) when a new matching candidate joins.
- **Team accounts**: the owner invites up to 9 recruiters by email; everyone shares jobs, credits, pipeline and chats.

**Candidate extras:** resume auto-fill (upload a PDF and the details form fills itself), profile strength meter, notifications (in-app + email), "Open to work" switch (off = hidden from companies), job preferences (work mode, job type, cities).

## Before going live

- Move file uploads from local disk to Cloudinary or S3 (hosts like Render wipe local disk on redeploy).
- Add the client's Razorpay keys, and Privacy Policy, Terms and Refund pages.
- Add email verification and password reset.
- Grow the admin page (today it only approves GST verification) into a full admin panel.
