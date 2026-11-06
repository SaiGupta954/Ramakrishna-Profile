# Ramakrishna Gampa — 3D Portfolio

A React portfolio with a GPU particle field that changes shape as you scroll, synthesized sound, and a spoken welcome.

## Run it

```bash
npm install
npm run dev        # local dev server at http://localhost:5173
npm run build      # production build in dist/
SINGLE=1 npm run build   # one self-contained index.html
```

## Deploy (GitHub Pages)

Live at **https://saigupta954.github.io/Ramakrishna-Profile/**

Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes `dist/` to the `gh-pages` branch that GitHub Pages serves.

Also works on Netlify (`netlify.toml`) and Vercel (`vercel.json`) with no changes.

## Stack

| Library | Used for |
| --- | --- |
| React 18 + Vite | app + build |
| three.js + @react-three/fiber | WebGL scenes |
| @react-three/drei | stars, orbit controls, adaptive DPR, performance monitor |
| @react-three/postprocessing | bloom, scroll-velocity chromatic aberration, grain, vignette |
| Custom GLSL | 22k-particle field morphing sphere → torus knot → server racks → signal waves → galaxy |
| framer-motion | letter reveals, scroll-linked text, velocity marquee, 3D tilt cards, magnetic buttons, cursor |
| GSAP ScrollTrigger | pinned horizontal "stack trace" experience section |
| Lenis | smooth scrolling |
| Web Audio API | opening sound, click/hover/typing sounds, ambient pad (all synthesized — no audio files) |
| Welcome splash | visitor enters their name; it lands in giant letters on the beat of the opening sound |

## Edit content

Everything text-based lives in `src/data/content.js`.
The welcome splash is `WelcomeSplash` in `src/components/Chrome.jsx`.

## Structure

```
src/
  App.jsx               scroll + chapter tracking, layout
  sound.js              audio engine + voice
  store.js              shared render-loop state
  data/content.js       resume content
  three/
    Scene.jsx           main canvas, camera rig, postprocessing
    ParticleField.jsx   morphing particle shader
    shapes.js           target point clouds
    SkillSphere.jsx     draggable 3D skills globe
  components/
    Chrome.jsx          preloader + sound gate, cursor, nav, magnetic wrapper
    Hero.jsx            hero, about, counters
    Experience.jsx      pinned horizontal timeline, tilt cards
    Projects.jsx        project cards with generative canvases
    Lower.jsx           marquee, skills, terminal, contact
```

## Tests

63 end-to-end checks (desktop, mobile, returning visitor, reduced motion):

```bash
pip install playwright && playwright install chromium
SINGLE=1 npm run build
python tests/e2e_suite.py
```
