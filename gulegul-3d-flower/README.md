# Gulegul 3D rose hero

Drop-in replacement for the three.js rose in `.hero-art` on `index-new.html`.

- `rose.js` — dependency-free WebGL renderer (no three.js / CDN). Procedural rose: golden-angle petal spiral, sepals, stem, leaves, gold dust.
- `rose-poster.png` — pre-rendered frame, shown until WebGL is live and kept as the fallback (no WebGL, context loss).
- `index.html` — demo hero (Cormorant Garamond + Montserrat, pink/gold tokens from the ui-ux-pro-max design system).

## Use on the live page
```html
<div class="hero-art" data-rose role="img" aria-label="A slowly turning red rose">
  <img class="rose-poster" src="rose-poster.png" alt="">
</div>
<script src="rose.js" defer></script>
```
See `index.html` for the `.hero-art` CSS. The canvas is sized by its container (`position:absolute; inset:0`), never by the viewport, and `.hero-art` has `overflow:hidden; contain:layout paint` — this is what keeps the hero from clipping text or pushing the WhatsApp button out.

## Notes
- Bloom: the rose opens from a bud over ~5s on load; click/tap it to replay. `?b=0..1` pins the bloom, `?t=` or reduced-motion shows it fully open.
- Quality tiers (low/medium/high) by screen width and CPU cores; `?q=low|medium|high` overrides.
- Pauses off-screen and on hidden tabs; `prefers-reduced-motion` renders one still frame; `?t=2` pins a frame (for screenshots).
- Patterns taken from 21st.dev "Lattice Hero" (container-sized canvas, adaptive quality, off-screen pause, damped pointer parallax). No 21st code is copied; 21st had no rose/flower component.
- Tested headless (SwiftShader): no horizontal overflow at 360/390/768/1440.
- Known: petal geometry is stylised/low-poly; there is a small see-through gap under the front outer petal at some angles.
