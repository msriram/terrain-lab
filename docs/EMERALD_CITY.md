# Emerald City

Emerald is an original, Oz-inspired procedural world. Palaces grow on dry elevated terrain; yellow brick roads link them, with supported causeways where routes cross water. The two browser modes use the same landscape layer, so raised and flooded terrain produce the same changes in the projector view.

`standalone-animal-demo/src/environment/world-architecture-layout.js` chooses palace and gem sites, plus connections. `src/environment/emerald-city.js` builds palaces, the road texture, causeways, gems, gate guardians, citizens, witches, and a rainbow that appears and fades. Citizens walk road routes and flee nearby witches. Witches pursue them; contact temporarily removes a citizen, who later respawns to keep the scene active. The shared motion clock pauses all of these effects.

To check an edit, run `npm test --prefix standalone-animal-demo`, `node scripts/build-site.mjs`, then from `standalone-animal-demo` run `node scripts/verify-emerald.mjs`. The browser check captures both modes and a visible rainbow, verifies terrain flooding and restoration, motion pause, guard and witch presence, and detects browser errors. Screenshots default to `/tmp/terrain-emerald-review` (`EMERALD_QA_DIR` overrides this). The full site check is `npm run test:site --prefix standalone-animal-demo`.
