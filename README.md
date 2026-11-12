# CST3144 After-School App — Frontend

Vue.js 3 frontend for the CST3144 Full Stack Development after-school lesson booking application. It communicates with the separate Express.js + MongoDB backend API using native `fetch()` Promises.

## Technologies Used

- **Vue.js 3** (`https://unpkg.com/vue@3/dist/vue.global.js` CDN global build using the Composition API)
- **JavaScript (ES6+)** with native `fetch()` Promises (no build step or bundler; no Axios/`XMLHttpRequest`)
- **HTML5** with semantic `<main>` landmarks, `v-cloak`, and ARIA dialog/live-region support
- **CSS3** responsive styling (`1200px` down to `480px` breakpoints) with `prefers-reduced-motion` support
- **Node.js** CLI syntax verification (`node --check`) via `npm` scripts (zero third-party runtime dependencies)

## Main Features

- **Lesson Catalogue (`GET /lessons`):** Displays lesson topics, locations, prices, available spaces, and lesson images (mapping stored `.png` filenames to `.jpg` assets in `images/` with inline SVG `@error` fallbacks).
- **Debounced Backend Search (`GET /lessons/search?q=...`):** 250ms debounced search input with immediate clear on empty queries, redundant whitespace suppression, and stale-response guards.
- **Sorting:** Sorts displayed lessons ascending or descending by topic, location, price, or available spaces (`topic`, `location`, `price`, `space`).
- **Teachers & Enrolment (`GET /teachers`, `GET /teachers/:id/lessons`, `GET /enrolment/:lessonId`):** Toggleable teacher filter panel (clicking an active teacher collapses it without re-fetching) and per-lesson live enrolment lookups refreshed selectively for confirmed items after checkout.
- **Shopping Cart Drawer & Checkout Validation (`POST /orders`, `PUT /lessons/:id`, `DELETE /orders/:orderId`):**
  - Slide-in cart dialog with keyboard `Escape` support, add/remove controls, and live remaining-space updates.
  - Pure validation for customer name (`^[a-zA-Z\s]+$`) and numeric phone number (`^\d+$`) on blur/input before checkout.
  - Sequential `PUT` confirmation per lesson with rollback cancellation (`DELETE /orders/:orderId`) if any `PUT` fails, keeping unconfirmed items in the cart and resetting state upon full confirmation.

## Folder Structure

```text
frontend/
├── .gitignore
├── index.html               # Vue 3 entry point, navigation, grids, cart dialog
├── package.json             # Metadata and Node.js syntax-check scripts
├── README.md                # Frontend documentation
├── css/
│   └── style.css            # Application layout, components, responsive rules
├── js/
│   ├── config.js            # Runtime API base URL configuration (APP_CONFIG)
│   └── app.js               # Vue 3 Composition API application logic
└── images/
    ├── CREDITS.md           # Openverse photography attribution & licences
    ├── hero.jpg
    ├── art.jpg
    ├── drama.jpg
    ├── english.jpg
    ├── french.jpg
    ├── geography.jpg
    ├── history.jpg
    ├── maths.jpg
    ├── music.jpg
    ├── pe.jpg
    ├── science.jpg
    └── teachers/
        ├── alice.jpg
        ├── bob.jpg
        └── carol.jpg
```

## Installation & Local Run Instructions

No `npm install` or compilation step is required because `dependencies` and `devDependencies` are empty and Vue 3 loads from the official CDN.

1. Start the separate Express.js backend API locally so it listens on `http://localhost:3000`.
2. Serve the `frontend/` directory over a local HTTP server (recommended), or open `index.html` in a modern browser:
   ```bash
   # Option A (Python)
   python -m http.server 5500

   # Option B (Node static server)
   npx serve .
   ```
3. Visit `http://localhost:5500` in your browser. On `localhost`, `127.0.0.1`, `[::1]`, or `file:`, the app automatically uses `localApiBaseUrl` (`http://localhost:3000`).

## API Configuration (`js/config.js`)

API routing is centralized in [`js/config.js`](js/config.js) (`window.APP_CONFIG`) loaded before [`js/app.js`](js/app.js):

```js
localApiBaseUrl: 'http://localhost:3000',
productionApiBaseUrl: '',
```

- **`localApiBaseUrl`:** Used automatically when running locally (`localhost`, `127.0.0.1`, `[::1]`, or `file:`).
- **`productionApiBaseUrl`:** Used when hosted on a non-local domain (such as GitHub Pages). Currently left intentionally empty (`''`) until your backend URL is ready.
- **Validation & Safety:** [`resolveApiConfig`](js/app.js) validates URLs (`http://`/`https://`, stripping trailing slashes and rejecting placeholders or `localhost` targets in production). All 8 API calls use `buildApiUrl(...)`. When `productionApiBaseUrl` is missing on a production origin—or `localApiBaseUrl` is missing locally—the frontend blocks network calls instead of falling back silently to `localhost` and displays a configuration error in the UI and console. Never store secrets or API credentials in `js/config.js`.

## Testing & Validation

Run built-in static checks from inside `frontend/`:

```bash
# JavaScript syntax check (runs node --check js/config.js && node --check js/app.js)
npm run check
# or
npm run lint

# Validate package.json JSON syntax
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"

# Check git working-tree whitespace/markers
git diff --check
```

Note: No automated browser DOM test runner is bundled in `package.json`; test UI flows manually in a browser against the running backend (lesson loading, 250ms search debounce, sorting, teacher panel toggle, enrolment lookup, checkout validation, `Escape` drawer closing, and order rollback/confirmation).

## GitHub Pages Deployment Guidance

Because all asset references (`css/style.css`, `js/config.js`, `js/app.js`, `images/...`) are relative paths, the frontend works under both root domains and GitHub Pages repository subpaths:

1. Deploy the separate Express.js backend and verify CORS allows your GitHub Pages origin.
2. In [`js/config.js`](js/config.js), set `productionApiBaseUrl` to your live `https://` backend URL (local development on `localhost` will continue using `localApiBaseUrl`).
3. Commit and push the frontend repository to GitHub.
4. In the GitHub repository settings under **Pages**, deploy from the target branch (`master`) root directory (`/`).

## Asset Credits

All 14 photographs in `images/` are royalty-free images retrieved via [Openverse](https://openverse.org), cropped and resized for this app (none are AI-generated). Full notes are preserved in [`images/CREDITS.md`](images/CREDITS.md):

| File | Subject | Photographer / Title | Licence | Source |
| :--- | :--- | :--- | :--- | :--- |
| `hero.jpg` | Classroom learning | **U.S. Department of Agriculture** — Children participating nutrition education activity | CC0 1.0 Universal | [Openverse / rawpixel](https://www.rawpixel.com/image/8708559/photo-image-public-domain-person-kids) |
| `maths.jpg` | Mathematics study | **Unknown** — Free calculator working desk image | CC0 1.0 Universal | [Openverse / rawpixel](https://www.rawpixel.com/image/5912338/image-background-public-domain-note) |
| `science.jpg` | Science experiment | **National Park Service** — (NPS photo by Kirsten Kearse) | CC0 1.0 Universal | [Openverse / rawpixel](https://www.rawpixel.com/image/4036947/photo-image-black-person-kids) |
| `english.jpg` | Reading / English | **National Institutes of Health (NIH)** — Child Reading Book with One Eye Covered | Public Domain Mark | [Openverse / flickr](https://www.flickr.com/photos/132318516@N08/48997124487) |
| `art.jpg` | Art supplies | **Unknown** — Paint brushes, canvas paint palette | CC0 1.0 Universal | [Openverse / rawpixel](https://www.rawpixel.com/image/5928238/photo-image-watercolor-public-domain-art) |
| `music.jpg` | Piano / music lesson | **pedrobonatto** — First notes | CC BY 4.0 | [Openverse / flickr](https://www.flickr.com/photos/71138097@N00/2660064932) |
| `drama.jpg` | Theatre stage | **Unknown** — Theater curtain stage | CC0 1.0 Universal | [Openverse / rawpixel](https://www.rawpixel.com/image/3297996/free-photo-image-stage-theatre-auditorium) |
| `geography.jpg` | Geography globe | **Cultural viewpoints from around the world** — 1 | CC BY 4.0 | [Openverse / flickr](https://www.flickr.com/photos/144683333@N02/27345059694) |
| `history.jpg` | History map | **Norman B. Leventhal Map Center at the BPL** — Typus orbis terrarum | CC BY 4.0 | [Openverse / flickr](https://www.flickr.com/photos/24528911@N05/2710792122) |
| `french.jpg` | French language | **Unknown** | CC0 1.0 Universal | [Openverse / rawpixel](https://www.rawpixel.com/image/5943564/free-public-domain-cc0-photo) |
| `pe.jpg` | Football / PE | **jrseles** — 090418-A-4676S-039 | CC BY 4.0 | [Openverse / flickr](https://www.flickr.com/photos/41777096@N02/3905343764) |
| `teachers/alice.jpg` | Teacher portrait (Alice Smith) | **Direct Media** — Business Woman | CC0 1.0 Universal | [Openverse / stocksnap](https://stocksnap.io/photo/business-woman-FPQIEQBMPA) |
| `teachers/bob.jpg` | Teacher portrait (Bob Jones) | **Direct Media** — Business Man | CC0 1.0 Universal | [Openverse / stocksnap](https://stocksnap.io/photo/business-man-IVZBYWKEFM) |
| `teachers/carol.jpg` | Teacher portrait (Carol White) | **citirecruitment** — business woman | CC BY 4.0 | [Openverse / flickr](https://www.flickr.com/photos/125303894@N06/14387367072) |
