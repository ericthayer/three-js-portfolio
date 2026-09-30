# three-js-portfolio

Eric Thayer — Design Engineer portfolio. A simple yet elegant three.js experience inspired by [patrickheng.com](https://patrickheng.com): a smooth horizontal-scrolling desktop journey with seamless WebGL case-study transitions, and a first-class vertical mobile experience.

## Highlights

- **Horizontal scroll (desktop)** — native vertical scroll is remapped to a lerped horizontal track, so scrollbar, keyboard, and momentum all keep working.
- **WebGL scene** — an ambient shader background that blends toward each project's palette, plus a distortion-shader image plane per project that bends and RGB-shifts with scroll velocity.
- **Case-study view transitions** — clicking a project animates its WebGL plane into the case-study hero, then the content fades and staggers in. `Esc` or ✕ reverses the transition.
- **Mobile-first fallback** — small/touch viewports get a natural vertical document flow with the same WebGL visuals.
- **Accessible** — keyboard-operable project cards, focus management, and full `prefers-reduced-motion` support.

## Develop

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview the build
```

## Structure

```
index.html            Page shell: hero, work, about, contact, case-study overlay
src/main.js           Wires panels, scroll, GL stage, and case-study transitions
src/scroll.js         SmoothScroll: vertical→horizontal remapping + mobile fallback
src/gl/stage.js       three.js renderer, background, DOM-tracked project planes
src/gl/shaders.js     Background noise shader + velocity-distortion plane shader
src/gl/textures.js    Procedural gradient textures (swap for real artwork)
src/data/projects.js  Case-study content — edit this to update the portfolio
```
