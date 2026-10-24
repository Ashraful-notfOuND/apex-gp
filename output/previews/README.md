# Renderer previews

These fifteen images are actual 1440 × 900 offscreen EGL/GLES renders of the car model and Monaco scenery, saved as WebP. All eight runtime shaders compile and link; every replayed GL command is checked for errors and each saved frame is checked for nonblank output and unexpected black regions. The scene framebuffer has packed 24-bit depth and 8-bit stencil; the shadow map retains its runtime 16-bit depth attachment. Frames include the reflective showroom floor, mapped constructor/sponsor artwork, tyre lettering, facade atlas, materials, filtered shadows, contact shading, fencing, layered sky and the final antialiasing/bloom pass. HTML controls, HUD and the live steering LCD are not included. Browser layout and a full human-driven lap still need play-testing on the host.

- car-front.webp — connected bodywork, nose, front wing, suspension and driver
- car-side.webp — sidepod livery, wheelbase and body proportions
- car-side-left.webp — opposite side and readable left-side livery
- car-rear.webp — rear wing, diffuser, exhaust and closed DRS flap
- car-drs-open.webp — the same rear view with the flap opened around its rear hinge
- car-top.webp — plan view of the bodywork, wings and cockpit
- car-cockpit.webp — close cockpit view of the halo, mirrors and front wheels
- monaco-garage.webp — car and driver in the landing page garage view
- monaco-onboard.webp — default TV-pod view and forward visibility
- monaco-chase.webp — solo car on the main straight
- monaco-hairpin.webp — side view through circuit fencing
- monaco-harbor.webp — coastal section with the closer quay and basin
- monaco-tunnel.webp — solid tunnel wall, ceiling and lamps
- monaco-hairpin-barriers.webp — overhead check of the continuous road, kerbs and safety boundary
- monaco-chicane-barriers.webp — overhead check that sharp offsets no longer fold across the road

The buildings, terrain and team liveries are original approximations. These renders do not establish photographic or commercial simulator fidelity.

For a selected view, use `node scripts/capture-model.mjs --views=monaco-garage --width=1440`.
Multiple comma-separated names are accepted; track views automatically include
the track geometry. Add `--performance` to check the direct rendering path with
the finishing pass and cast shadows disabled.

To reproduce all fifteen images from the repository root:

```sh
node scripts/capture-model.mjs --track
python3 scripts/render-capture.py
```

The capture script records commands from the actual game renderer to `/tmp/apex-render-capture.json` (several hundred MB with the track). Omit `--track` to render only the eight model/garage views. Both scripts accept an explicit JSON path. Development requirements are Node, Python with Pillow, `/usr/include/GLES2/gl2.h`, Mesa surfaceless EGL/GLES, librsvg and Cairo. These native tools are only needed to regenerate previews; the game has no native or Python runtime dependency. No browser, server or network asset is used by this workflow.

The new facade texture uses built-in imagegen: `dist/assets/monaco-facades.webp`. Its complete prompt is in `facade-v3-prompt.txt` at the project root.
