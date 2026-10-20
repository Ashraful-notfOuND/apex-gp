# APEX formula car model

`apex-formula-2026.glb` contains the actual replacement geometry used by the game, exported with indexed meshes, 17 named nodes and embedded livery/tyre PNGs. Units are metres; +Y is up and +Z is forward. The wheelbase is 3.4 m and outside width is approximately 1.9 m. Wheels, steering assembly and DRS flap are separate nodes with their runtime origins.

This is original illustrative APEX GP geometry. It is not manufacturer CAD, an officially licensed team model, or a dimensionally verified replica. All eleven game entries share the same base shape with individual colors and locally authored livery maps. The GLB contains the default Ferrari-style finish and soft tyres. Materials approximate the game's display; real-time shadows, the animated LCD and shader reflections belong to the game renderer.

Authoring files:

- `dist/car-model.js` — assembled bodywork, cockpit, driver, wings, suspension and wheels
- `dist/model-surfaces.js` — continuous surfaces, lofts, sweeps and airfoil sections
- `scripts/build-liveries.mjs` / `scripts/brand-art.mjs` — editable vector paint, badges, sponsor marks and tyre artwork
- `scripts/export-car.mjs` — reproducible GLB exporter

The 2048-square livery atlas includes body and nose sponsors, constructor badges, front-wing endplates and rear-wing graphics. These are simplified, locally drawn marks with illustrative placements. They are not an exact reconstruction of the 2026 car's decal sheet. The soft-tyre map is 512 square.

To regenerate the artwork and portable model (rasterization needs Python, Pillow, librsvg and Cairo):

```sh
npm run model:liveries
python3 scripts/vector_art.py dist/assets/livery-ferrari.svg output/models/livery-ferrari.png
python3 scripts/vector_art.py dist/assets/tyre-soft.svg output/models/tyre-soft.png
npm run model:export
```

The exporter embeds these local PNGs. Included PNGs match the current SVGs; no rasterization tools are needed at runtime.

Runtime geometry and all artwork are local; the game does not download model assets from a third-party host. Formula One, constructor names and associated marks belong to their respective owners. No endorsement is implied.
