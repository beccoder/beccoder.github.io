# beccoder.github.io

Personal CV site for Bekhzod Khudoyarov: static HTML, CSS, and JS with no build step.

- `index.html`: content
- `styles.css`: dark theme, per-section accent colors, screen transitions, responsive and print styles
- `script.js`: section routing (links, keys 1-4, Esc), text reveal, and the canvas particle scene
- `assets/Bekhzod_Khudoyarov_CV.pdf`: downloadable CV
- `.github/workflows/deploy.yml`: deploys to GitHub Pages on every push to `main`

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Updating

Edit `index.html`, replace the PDF in `assets/` if the CV changes, then commit and push to `main`.
