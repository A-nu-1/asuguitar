ASU GUITAR LAB - MAGICAL HOMEPAGE (TAILWIND V4)

Copy these files into your EXISTING asuguitar project, preserving the paths:

  app/page.tsx                         -> app/page.tsx
  app/globals.css                      -> app/globals.css
  components/magic/MagicScene.tsx     -> components/magic/MagicScene.tsx
  public/magic/asu-skyline.png        -> public/magic/asu-skyline.png
  public/magic/asu-garden.png         -> public/magic/asu-garden.png
  public/magic/asu-puppy.png          -> public/magic/asu-puppy.png
  public/magic/asu-kitten.png         -> public/magic/asu-kitten.png

DO NOT replace app/style.css; it holds working guitar editor rules.
DO NOT change app/layout.tsx, Navbar, SQLite, or Electron files.

If you already have useful custom animations in globals.css, APPEND the
keyframes instead of replacing that file; keep exactly one Tailwind import.

Test: npx tsc --noEmit, then npm run dev.
This uses the original browser-demo-only microphone logic. Electron mic hidden.
The dog and cat react to clicks, three DIFFERENT butterflies fly on click,
and three caterpillars crawl at the bottom. Song cards keep their real links.
Images come from the illustration and have been cropped to avoid baking the
song names and navigation into the functional UI.
