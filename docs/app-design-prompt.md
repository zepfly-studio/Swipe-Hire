# SwipeHire – App UI & Theme Guide

This guide is for building the **SwipeHire mobile app** so that it looks and feels exactly like the website (https://swipehire.in, running locally at http://localhost:5173).

Part 1 is a ready-to-paste prompt for an AI design or code tool.
Part 2 is the exact spec: colours, fonts, sizes and components. Use it as the source of truth.
Part 3 lists the brand files to use.

---

## Part 1 – Prompt (copy and paste)

```
Design a mobile app called "SwipeHire" (tagline: "Right swipe, right job.").
It is a Tinder-style hiring app for India:
- Companies swipe through candidate cards (resume + 15-second intro video).
- Swipe right = shortlist (unlocks the candidate's phone and email).
- Swipe left = pass. Heart = save to wishlist.
- Candidates create a profile (with an expected salary range and a "negotiable" checkbox),
  upload a resume and record an intro video, then see which companies shortlisted them.
  Companies can only shortlist a candidate if the job budget reaches the candidate's minimum
  salary, or the candidate marked it negotiable. After shortlisting, a company can chat,
  send a task with a deadline (the candidate submits a live link and GitHub repo), and
  invite them to an interview.

VISUAL STYLE: light, airy, premium, friendly. Soft "glass" panels on a very light
lavender-grey background, with blurred pink and violet glows in the corners.
One signature gradient is used for every primary action: pink #EC3D64 → violet #6D4AFF
(left to right, or top-left to bottom-right).

COLOURS
- Page background: #F5F5FA (with soft blurred glows: pink #FBE3EA top-left, lavender #E6E0FF bottom-right)
- Panels / sheets: #FFFFFF
- Cards and inputs: #15151F at 4% opacity over the background (looks like #EBEBF0), 1px border #15151F at 10%
- Text: #15151F (primary), #15151F at 55% (secondary), #15151F at 40% (hints and placeholders)
- Brand: pink #EC3D64 (pressed #D42A52), violet #6D4AFF
- Success / shortlist: green #059669. Info / verified: blue #0284C7. Warning: amber #B45309. Danger / pass: pink #EC3D64
- Text on the gradient is always white

TYPOGRAPHY: "Plus Jakarta Sans" for the whole UI.
- Page titles: 28–30pt ExtraBold (800), tight letter spacing
- Card name: 26pt ExtraBold
- Body: 15pt Regular or Medium
- Form labels: 11pt SemiBold, UPPERCASE, letter spacing 0.12em, 50% opacity
- Gradient text: highlight one word in headings, e.g. "speed of a [swipe.]"

SHAPES: very rounded.
- Buttons and inputs: 12pt radius
- Small cards: 16pt
- Panels: 24pt
- Swipe card: 30pt
- Chips and pills: fully round

COMPONENTS
- Primary button: gradient fill, white SemiBold 15pt text, 12pt radius, 48pt tall,
  soft pink shadow (#EC3D64 at 25%, blur 16). On press: scale to 0.96.
- Secondary button: transparent glass with a 1px border at 10%, dark text.
- Input: glass fill, 1px border at 10%, 12pt radius, 48pt tall, optional leading icon at 40% opacity.
  When focused: pink border at 60% plus a 4pt pink focus ring at 10%.
- Chips: fully round, #15151F at 6%, 12pt Medium text at 70%. Selected chip = gradient with white text.
- Swipe card: full-width, 30pt radius, 1px border, big soft shadow.
  - Top: round gradient avatar with initials (or photo), name in 26pt ExtraBold, role below at 55%.
  - Then pill tags: "% match" (green, or amber below 60%), city, years of experience.
  - Middle: resume preview (white page) with an intro video tab.
  - While dragging: green "SHORTLIST" stamp when moving right, pink "PASS" stamp when moving left.
    The card tilts up to about 12° and flies off with spring physics.
- Action bar under the card, in a frosted pill:
  - Undo: small white circle, amber icon
  - Pass: large white circle, pink ✕, pink border at 40%
  - Wishlist: medium white circle, violet heart
  - Shortlist: large white circle, green ✓, green border at 40%
- Pipeline stage pills (fully round, 12pt Bold):
  - Shortlisted: grey
  - Contacted: blue
  - Task sent: violet
  - Interview: amber
  - Hired: green
  - Rejected: pink
  - Each pill uses a tinted background at 15% with the strong colour as text.
- Verified company: small blue (#0284C7) check-badge next to the company name.
- Bottom tab bar: floating, 12pt from the screen edges, 16pt radius, white at 90% with blur,
  1px border. Active tab = gradient icon with a label.
  - Company tabs: Swipe, Jobs, Shortlisted, Messages, Interviews (Wishlist, Tasks, Plans, Team and Settings live in the avatar menu)
  - Candidate tabs: Home, Messages, Tasks, Interviews (Edit profile and Settings live in the avatar menu)
- Toasts: white, 14pt radius, SemiBold text, at the top on mobile.
- Empty states: a 3D pastel illustration (about 220pt wide), a bold title, one line of help text,
  and one primary button.

MOTION: everything uses springs (stiffness about 260, damping about 20). Cards and lists fade up
12pt as they enter. Buttons lift 2pt on hover and scale to 0.96 on press. Celebration screens
(profile live, payment done, company verified) show a small confetti burst in pink, violet,
green, amber and blue.

ICONS: Lucide icon set, 1.75–2pt stroke, rounded. No emoji in the UI chrome.

ILLUSTRATIONS: glossy 3D pastel style, in pink-to-violet gradients with white and lavender,
soft shadows and a transparent background (the brand illustration files are provided).

Keep the layout clean, with generous spacing (16pt screen padding, 12–20pt between groups),
and full support for small Android phones (360pt wide).
```

---

## Part 2 – Exact spec (source of truth)

### Colours

| Token | Value | Used for |
|---|---|---|
| `bg` | `#F5F5FA` | App background |
| `surface` | `#FFFFFF` | Sheets, modals, dropdowns, nav bar (90% + blur) |
| `card` | `#F0F0F6` | Swipe card body |
| `glass` | `#15151F` @ 4% + background blur 24 | Panels, inputs, secondary buttons |
| `border` | `#15151F` @ 10% | All 1px borders |
| `text` | `#15151F` | Primary text |
| `text-2` | `#15151F` @ 55% | Secondary text |
| `text-3` | `#15151F` @ 40% | Placeholders, hints |
| `brand` | `#EC3D64` | Pink accent, pass, errors |
| `brand-dark` | `#D42A52` | Pressed state |
| `violet` | `#6D4AFF` | Gradient end, wishlist |
| `gradient` | `#EC3D64 → #6D4AFF` | Primary buttons, avatars, active tab, highlighted words |
| `success` | `#059669` (text `#047857`) | Shortlist, hired, match ≥ 60% |
| `info` | `#0284C7` (text `#0369A1`) | Verified badge, contacted |
| `warning` | `#B45309` | Interview stage, undo, match < 60% |
| `glow-pink` | `#FBE3EA` | Blurred background blob |
| `glow-violet` | `#E6E0FF` | Blurred background blob |

### Type scale (Plus Jakarta Sans)

| Style | Size / weight |
|---|---|
| Hero (welcome) | 44–48 / 800, line height 1.05 |
| Page title | 28–30 / 800 |
| Card name | 26 / 800 |
| Section title | 18 / 700 |
| Body | 15 / 400–500 |
| Small | 13 / 500 |
| Label | 11 / 600, uppercase, letter spacing 0.12em |

### Radius, spacing, shadow

- **Radius:**
  - Buttons and inputs: 12
  - Chips: full
  - Small card: 16
  - Panel: 24
  - Modal: 28
  - Swipe card: 30
- **Spacing:** 4-pt grid.
  - Screen padding: 16
  - Card padding: 20–24
  - Gap between fields: 16
- **Shadow:**
  - Primary button: `0 8 16 #EC3D64 @25%`
  - Swipe card: `0 24 48 #15151F @18%`
  - Floating nav: `0 16 40 #15151F @15%`

### Screens on the website, to mirror in the app

- **Welcome / login:**
  - Logo with tagline, the headline "Hiring at the speed of a swipe."
  - A Create account / Log in toggle (gradient pill slides between them)
  - Role cards: "I want a job" / "I'm hiring"
- **Candidate onboarding** (4 steps with a progress bar):
  1. Basic details (option to auto-fill from the resume)
  2. Role and skills
  3. Resume PDF
  4. Intro video, 5–15 s, recorded in the app with a countdown
  - Ends with a "You're live!" success screen.
- **Candidate home:**
  - Profile-live toggle, profile strength meter
  - Companies that shortlisted you (with a company details sheet)
  - Preferences
- **Company:**
  - Swipe screen (job selector, filters, saved searches, undo, swipes-left counter)
  - Jobs, Shortlisted (stages, message icon, send task, interview), Wishlist
  - Plans (₹399 = 150 swipes), Verify company, Team, Company profile
- **Shared:**
  - Messages (only chats with messages; "New message" picks from shortlisted people; read ticks)
  - Tasks (company: sent tasks, submissions, change deadline, cancel; candidate: brief, countdown, submit live + GitHub links)
  - Interviews (schedule, accept / decline)
  - Notifications bell
  - Account settings (photo, name, phone, password, log out of all devices)

### Illustrations: which screen uses which file

| File (`client/public/illustrations/`) | Screen |
|---|---|
| `hero-swipe.webp` | Welcome / login |
| `no-candidates.webp` | Swipe deck empty / no filter match |
| `out-of-swipes.webp` | Out of swipes → plans |
| `empty-pipeline.webp` | Pipeline empty |
| `empty-wishlist.webp` | Wishlist empty |
| `no-messages.webp` | No chats |
| `no-interviews.webp` | No interviews |
| `no-jobs.webp` | No jobs posted |
| `no-notifications.webp` | Notifications empty |
| `waiting-shortlist.webp` | Candidate: no shortlists yet |
| `record-video.webp` | Intro video step |
| `profile-complete.webp` | "You're live!" |
| `verified.webp` | Company verified |
| `offline.webp` | No internet |

---

## Part 3 – Brand files

Website project (`client/public/`):

| File | Use |
|---|---|
| `brand/swipehire-logo.png` | Full logo with tagline, transparent, 1204×309 |
| `brand/logo.webp` | Logo without tagline (app header) |
| `brand/logo-tagline.webp` | Logo with tagline (welcome screen) |
| `brand/logo-icon.webp` | Icon only |
| `favicon-512.png` | Icon 512×512 transparent: source for the Android adaptive icon |
| `apple-touch-icon.png` | iOS icon on white |
| `og-image.jpg` | Share / store-listing banner, 1200×630 |

Full-size originals (transparent PNGs) are in the `SwipeHire Transparent` folder. They include `SwipeHire Logo (transparent).png` and `SwipeHire App Icon (transparent).png` (1024×1024), which is the source for the App Store and Play Store icons. Store icons must not be transparent, so place it on white `#FFFFFF` or on the gradient.
