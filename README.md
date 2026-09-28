# beccoder.github.io

Personal CV site for Bekhzod Khudoyarov: static HTML, CSS, and JS with no build step.

- `index.html`: content
- `styles.css`: design tokens, light/dark themes, responsive layout, print styles
- `script.js`: theme toggle, mobile menu, scroll reveal, copy-email
- `assets/Bekhzod_Khudoyarov_CV.pdf`: downloadable CV
- `.github/workflows/deploy.yml`: deploys to GitHub Pages on every push to `main`

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Updating

Edit `index.html`, replace the PDF in `assets/` if the CV changes, then commit and push to `main`.
