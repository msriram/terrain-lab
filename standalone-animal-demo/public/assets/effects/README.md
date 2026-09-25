# Effects and optional sprites

Animals are animated GLB meshes, not sprite billboards.

Current shadow sprites are generated locally by `src/rendering/effects.js`.
Splash and wake rings are Three.js geometry. Their timing comes from
`src/animation/controller.js`; behavior decisions live in `src/simulation/`.
There are no third-party effect textures to attribute.

Put future optional textures here (for example `water/splash-atlas.png`), with
an `ATTRIBUTION.md` entry and explicit license. Load them through the rendering
adapter only. Keep sprite rendering out of species behavior and habitat code.
