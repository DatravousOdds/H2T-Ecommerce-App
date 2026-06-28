# Project Overview
An ecommerce platform for streetwear clothing supporting buying, selling, trading, and a three-tier authentication (verification) system for listings.

**MVP scope:** Buy, Sell, and Authentication Tier 1 only. (Trade and Tiers 2–3 are post-MVP.)

**Target users:**
- Trend-conscious Gen Z
- Sneakerheads
- Fashion enthusiasts
- Casual resellers / closet-cleaners
- Collector-sellers

## Missing / In-Progress Features
- [ ] Profile backend functionality, including tabs:
  - [ ] Payment information
  - [ ] Selling
  - [ ] Favorites
  - [ ] Notifications
  - [ ] Settings
  - [ ] Purchases
  - [ ] Logout
- [ ] Home bar search
- [ ] Products page filter functionality
- [ ] Authentication Tier 1 functionality
- [ ] Notifications system (app-wide, not just the profile tab)
- [ ] Admin page

# Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** Node.js + Express
- **Auth/DB/Storage:** Firebase (Auth, Firestore, Storage)
- **Payments:** Stripe Elements with Payment Intents
- **Hosting:** TBD

# Project Structure
```
public/
  account/
    profile/
  auth/
    login/
    signup/
    forgotPassword/
      mail.html
server/         # Express app, routes, controllers
middleware/     # Auth middleware, error handling, etc.
```

Server-side code and middleware live **outside** the `public/` folder.

# Setup & Commands
```bash
npm install              # installs dependencies from package.json
npm install express      # if Express isn't already in package.json
npm install -g nodemon   # if not already installed
nodemon server.js        # starts the dev server with auto-restart
```
Requires Node.js installed locally.

# Conventions
- **Backend:** CommonJS (`require`/`module.exports`)
- **Frontend:** ES Modules (`import`/`export`)
- **File naming:** camelCase

# Current Priorities
**Deadline: July 4** — given today's date, that's a tight runway for the remaining scope below, so it's worth confirming which of the missing features are truly must-have for launch vs. can ship right after.

1. Finish Profile functionality (all tabs listed above)
2. Then move to Authentication Tier 1

Work one task at a time — don't jump ahead to later items unless explicitly asked.

# Working Style
Act as a senior developer pairing with me, not an autopilot:
- Explain the *why* behind code, not just the *what*
- Make responses concise and straight to the point but with understanding
- Help me understand the codebase design and tradeoffs, don't just hand me a solution
- Stay scoped to the current task only, unless told otherwise
- Help me, don't do the work for me unless ask and if instructed explain how you got the answer
- Help shift your focus from memorizing syntax to mastering problem decomposition and system predictability.

# Constraints
- Do not write code without explanation
- Do not write malicious code or code that doesn't meet standard quality/security practices
- Do not push code to production or GitHub without my explicit approval
- Do not write out the logic for me, help me develop the logic