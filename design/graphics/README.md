# Swipe Hire graphics

These are the full-size source files. The website uses smaller, optimized copies (WebP) from `client/public/illustrations` and `client/public/brand`. Colours and style are described in `docs/app-design-prompt.md`.

| Folder | What's inside |
|---|---|
| `logo/` | The official logo with the tagline "Right swipe, right job." (`swipehire-logo-original.jpeg`); the same logo with a transparent background; and the app icon (1024×1024, transparent). Use the icon for the Play Store and App Store, placed on white or on the brand gradient, because store icons can't be transparent. |
| `transparent/` | Illustrations with the background removed: empty states, success screens, the hero phone, onboarding art. |
| `with-background/` | Banners and scenes where the background is part of the design: social and app-store banners, the 404 scene and the share-image mockup. |

## Where the website uses them

| Website file (`client/public/...`) | Source |
|---|---|
| `brand/logo.webp`, `brand/logo-tagline.webp`, `favicon-*.png`, `apple-touch-icon.png` | `logo/swipehire-logo-original.jpeg` |
| `illustrations/hero-swipe.webp` (landing page, login page) | `transparent/3D Swipe App with Floating UI Icons.png` |
| `illustrations/how-it-works.webp` | `transparent/Swipe to Hire_ A Three-Step Journey.png` |
| `illustrations/for-companies.webp` | `transparent/Gradient Candidate Profile Cards.png` |
| `illustrations/cta-banner.webp` | `with-background/Pastel Profile Cards and Checkmarks.png` |
| `illustrations/not-found.webp` | `with-background/Dreamy Compass Through the Clouds.png` |
| `og-image.jpg` (link previews) | `with-background/Pastel Candidate Matching App Mockup.png` plus the logo |
| `illustrations/no-candidates.webp` | `transparent/Pastel Candidate Search Illustration.png` |
| `illustrations/out-of-swipes.webp` | `transparent/Rocket Launch with Golden Coins.png` |
| `illustrations/no-messages.webp` | `transparent/Pastel Chat Bubbles and Paper Airplane.png` |
| `illustrations/empty-wishlist.webp` | `transparent/Glossy Favorite Profile Heart.png` |
| `illustrations/empty-pipeline.webp` | `transparent/Verified Profile Folder Illustration.png` |
| `illustrations/waiting-shortlist.webp` | `transparent/Pastel Productivity With Notifications.png` |
| `illustrations/no-interviews.webp` | `transparent/Pastel Calendar and Coffee Workspace.png` |
| `illustrations/no-jobs.webp` | `transparent/Add-Task Briefcase and Clipboard.png` |
| `illustrations/no-notifications.webp` | `transparent/Sleeping Pastel Notification Bell.png` |
| `illustrations/offline.webp` | `transparent/Sad Cloud and Disconnected Plugs.png` |
| `illustrations/verified.webp` | `transparent/Futuristic Office Security Shield.png` |
| `illustrations/profile-complete.webp` | `transparent/Celebratory Approved Profile Card.png` |
| `illustrations/shortlisted.webp` | `transparent/Celebrating Likes in Purple.png` |
| `illustrations/record-video.webp` | `transparent/Cheerful Vlogger Recording Setup.png` |

`with-background/No More Candidates Empty State.png` and `with-background/SwipeHire_ Find Talent Faster.png` were made for the old dark theme and aren't used.
