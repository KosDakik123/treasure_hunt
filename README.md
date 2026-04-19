# Treasure Hunty Zagreb

A **mobile-first**, vanilla **HTML / CSS / JavaScript** treasure hunt for **Zagreb, Croatia**. Players walk the city with **live GPS**, follow **turn-by-turn style hints** on **Google Maps**, and complete small **checkpoints** before collecting each location.

- **Live GPS** via `navigator.geolocation.watchPosition`
- **Walking + transit** time estimates (Google Directions)
- **1–3 “memory” photos** on the way (camera roll / camera capture)
- **Checkpoint quiz**: tap a **clue**, then its **matching fact** (two pairs per place)
- **Score + progress** saved in `localStorage` (same browser / device)

## Try it on GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment**
   - **Branch:** `main`
   - **Folder:** `/ (root)`
3. Open: `https://<your-username>.github.io/<repo-name>/`

Deployment can take **1–10 minutes** after a push. Hard-refresh (`Ctrl+F5`) if you still see an old version.

## Google Maps API key

The Maps JavaScript API loads from `index.html`. Replace the `key=` value with **your** key.

Enable at least:

- **Maps JavaScript API**
- **Directions API** (walking + transit routes)

Billing must be enabled on a Google Cloud project (Google’s requirement for Maps). Restrict the key by **HTTP referrer** to your GitHub Pages domain.

## Run locally

Use any static server (double-clicking `index.html` may block geolocation or Maps on some browsers):

```bash
npx serve .
```

Then open the printed `localhost` URL on your phone (same Wi‑Fi) or use USB debugging.

## Permissions

- **Location:** required for real tracking.
- **Camera / photos:** browser will ask when you pick “Add photos”.
- **Motion (optional):** improves the compass on some phones.

## Project layout

| File | Role |
|------|------|
| `index.html` | Structure, Maps script tag, screens |
| `styles.css` | Layout, theme, quiz + photo UI |
| `app.js` | GPS, map, routes, photos, quiz, saves |
| `manifest.json` | PWA metadata |
| `sw.js` | Offline shell cache (optional) |
| `assets/` | Icons + Zagreb branding image |

## License

This project is licensed under the **MIT License** — see the `LICENSE` file in the repository root (if present) or add one on GitHub when you publish.

---

Made for exploring Zagreb on foot — stay aware of traffic, trams, and your surroundings.
