# APEX GP — Monaco Qualifying

A desktop browser racing challenge: choose a car, choose tyres and Go. Eleven constructors, manual gears, no driving assists, three qualifying rounds and one retained best time. The landing page shows no car ratings, capabilities or performance bars.

## Run

For an **rCTF challenge with per-team HTTP instances, unlimited practice, three qualifying rounds and automatic lap-based CTF points**, use the [rCTF deployment guide](deploy/rctf/README.md). It includes the shared persistent coordinator, rCTF sign-in, Docker instance configuration and dynamic-score publisher. The static preview below does not supply event scoring.

Requires a keyboard/WebGL browser. Use Node.js 24 for deployment (`.node-version` pins the major version); the code also runs on Node.js 20+. There are no npm dependencies.

```sh
cd apex-gp
npm run dev
```

Open **http://localhost:5174**. The default **Guest qualifying** mode gives this browser three local rounds. Progress and its best time are saved in localStorage. This guest record is convenient local play, not an authenticated event entry.

**Driver** settings contain optional unlimited practice, ranked qualifying and the graphics setting. **Timing** opens the event leaderboard. Both stay outside the main car/tyre/Go flow.

## Three-round format

Each qualifying round consists of the short out-lap from 120 m before the timing line and **exactly one flying lap**. Crossing the line ends that round automatically. Up to ten minutes are allowed to finish. The fastest valid lap across the three rounds is retained; there is no fourth attempt.

Starting a round consumes one attempt. Invalid laps, an abandoned/replaced session, lost live timing or a server restart do not refund it. The interface shows Q1/Q2/Q3 and the result of each used round. Earlier valid times remain available after a slower or invalid round. Local guest progress is browser-specific; authenticated event progress is enforced on the server.

Twelve sequential timing gates validate the 3.337 km circuit, with three sectors. **Wall bumps never invalidate a lap or retire the car.** Impacts still shed speed and deflect the car; running over the painted edge reduces grip. There is no accumulating collision damage. Missing timing gates or recovering the car still invalidates the lap. Qualifying ends on pause, hiding the tab or losing window focus. Unlimited practice can be paused and does not use any of the three qualifying attempts. Recovery is available only in practice, with a five-second hold.

## Ranked event entry

Create one entry/token for each competing player. A CTF team can designate the player who uses its token; sharing a token also shares its three-round allowance.

```sh
npm run team -- "Player or CTF team name"
```

Give the generated token privately to its player. It is shown once and stored as a SHA-256 hash in private `data/teams.json`. Provision entries one process at a time. Duplicate names are rejected.

In **Driver**, select **Event qualifying**, enter the token and Save. The settings confirm the remaining rounds. Credentials stay in page memory and are not saved to browser storage. The server reads new entries when a round starts, so provisioning does not require a restart.

`data/rounds.jsonl` durably records attempts per entry, event and simulation version. `GET /api/driver` authenticates the token and returns round history, remaining attempts and the entry's best time. Reopening the browser, changing car/tyres, replacing a session, expiring a session or restarting Node cannot obtain a fourth ranked round. One active session is allowed per entry.

## Points

Each entry's best server-validated lap enters the event board. The fastest distinct time receives **1,000 points**, the slowest **200**, and the intermediate distinct times receive `round(1000 - 800 × index / (distinctTimes - 1))`.

Equal millisecond times share points and competition rank. A single finisher or an all-tied field receives 1,000 each. Entries without a valid lap score 0 and do not enter the finisher ranking. Scores update when the field improves. Guest and practice times do not enter the event board.

## Controls

| Key | Action |
| --- | --- |
| W / S | Accelerate / brake |
| A / D | Steer left / right in the driving camera (mapping swapped) |
| Q / E | Shift down / up |
| Space, held | One continuous DRS activation per lap |
| Shift, held | ERS battery |
| C | TV pod / cockpit / chase / trackside view |
| Escape | Pause practice / end qualifying round |
| R | Recover car in practice only |
| M | Sound |

Automatic gears, ABS, traction control, racing line, automatic braking and steering correction are disabled. The steering rack does not change its angle/rate with speed. Tap steering at speed, and shift manually before the rev limiter.

The dynamic bicycle model includes front/rear tyre forces, a friction circle, load transfer, downforce, drag, thermal windows, degradation, wheelspin, locking, shift interruption, impact response, fuel and battery recovery/deployment. Car profiles retain different internal physics parameters. No car performance statistics are displayed. Internal profiles are illustrative game calibration, not measured manufacturer telemetry.

Soft, medium and hard compounds differ in grip, warm-up, optimum temperature, working window and wear. The track is solo: no traffic cars, collision opponents, slipstream or dirty-air effects.

The challenge gives **one DRS activation per lap**, independent of detection zones or another car. Hold Space with the brakes released and steering nearly straight. The first actual wing opening spends the allowance; releasing Space, braking or substantial steering closes the flap. It cannot reopen during the same lap, including after resetting in practice. There is a separate out-lap allowance; the flying-lap start and each subsequent timing-line crossing refresh it. Release Space before the next activation: holding it across the line cannot open the wing automatically. The HUD shows remaining allowance, OPEN and USED. The server replays this same rule. This is a deliberate challenge rule; [2026 F1 uses active aero and overtake mode](https://www.formula1.com/en/latest/article/everything-you-need-to-know-about-the-new-f1-rules-for-2026.48bv0VTxhIlhrQXmxercXk).

## Graphics

The showroom has a reflective tiled floor, a larger car composition, overhead
softboxes, illuminated display-bay edges, wall graphics and workshop equipment.
The car reflection uses mirrored model geometry under a translucent floor, and
the studio key and fill lights remain independent of the room's ceiling.
Outdoor rendering uses warmer directional light, cool shaded surfaces, layered
clouds and mountains, distance haze, finer asphalt grain and rubbered-in lanes,
glossier harbor water, and projecting cornices, balconies and varied rooftops.
High graphics adds an edge-aware antialiasing pass, subtle highlight bloom,
vignette and bounded dithering, at up to 2× device pixel ratio. Performance mode
disables this finishing pass and cast shadows. These are rendering changes;
the event physics and qualifying records retain their existing version.

The car uses a replacement mesh with a connected floor/sill, capped monocoque, rolled cockpit rim, descending sidepod shoulders, small recessed radiator slots, integrated airbox, continuously swept halo, tapered suspension links, brake uprights and three closed front-wing elements. The rear wing includes a separate DRS flap, hinge pins and actuator. Driver geometry includes a shaped full-face helmet, reflective visor, HANS/headrest, harness, sleeves and gloved hands attached to the steering yoke. Its physical screen shows live gear/speed/battery data.

All eleven choices have 2048-square locally authored SVG livery atlases with explicit body-panel UVs, constructor badges and sponsor marks on the body, nose and wings; three tyre maps supply compound-colored sidewall lettering. The artwork uses simplified local vector drawings and illustrative placements, rather than exact 2026 decal layouts. This is original illustrative geometry and paint, not manufacturer CAD or a precise reconstruction of eleven different chassis. Only the selected car is built initially; later selections are cached. The garage uses softbox reflection shapes and a tighter shadow projection to make the surfaces and contact shadows easier to inspect.

The same runtime geometry is supplied as `output/models/apex-formula-2026.glb` (17 named nodes, indexed meshes, embedded default Ferrari-style paint and soft-tyre textures). Edit the authoring surfaces in `dist/model-surfaces.js` and `dist/car-model.js`. `npm run model:liveries` rebuilds the 11 SVG car atlases and 3 tyre maps; `npm run model:export` rebuilds the GLB using the included PNG export textures. See `output/models/README.md` for the texture workflow. This visual update keeps the v3 simulation and existing round allowances.

The renderer uses per-surface roughness and metalness, Fresnel reflections, a clear-coat response, filmic tone mapping, a stabilized 2048² directional shadow map with fractional tent filtering, a tighter depth range, fading borders and soft contact shading beneath the tyres and floor, plus textured asphalt, concrete, carbon and a generated four-style facade atlas. Facades use local UV coordinates that survive scenery batching. The model sampler supplies mapped paint, tyre sidewalls and matte circuit sign artwork. `npm run scene:art` rebuilds the sixteen local vector sign panels. Monaco flags, storefront plaques, sponsor boards, sector/wayfinding signs and feathered palm fronds add circuit detail. Back-facing surfaces are shaded correctly, so palms and bodywork no longer wash out white. Monaco scenery includes corrugated Armco, antialiased catch fencing with distance fading, pit garages, balconies, roof terraces, rooftop equipment, shop awnings, planted beds, drain covers, street lamps, palms, marshals, crowds/grandstands, tunnel lighting, yachts and animated water. The basin follows the coastal section with a close stone quay instead of a distant rectangular water patch. The tunnel has a solid wall and enclosed ceiling. The visible road, edge lines, kerbs, Armco and fences follow the boundary of the union of road-width capsules, so sharp turns cannot fold offsets across the road. Every safety segment and low sign/tunnel-wall footprint is checked against all nearby circuit branches. These are visual changes; timing, collision rules and existing round allowances retain the v3 simulation. Scenery is batched into spatial cells for visibility and shadow culling. The race HUD is compact and leaves the road visible.

This remains a simplified real-time browser scene. Buildings/elevation are not surveyed Monaco assets, team cars share an original base model, reflections are approximate, and it does not achieve full photographic or commercial simulator fidelity. There are no remote runtime assets or fonts. Driver → Graphics → Performance disables cast shadows and lowers rendering resolution for slower hardware.

## Validation and review

The Node server replays sequenced, bounded control-input batches at **120 Hz** with versioned physics. It derives gates, positions, contact and times itself; submitted client times/positions/scores are ignored. It rejects malformed, duplicate/out-of-order, future-speed and stale inputs. Every player receives the same event seed and initial conditions. Public HTTP routes use an asset allowlist; private files stay outside `dist/`.

This does not establish that a human generated the controls. Synthetic DOM input checks deter only simple event injection. OS automation, browser control or direct clients can still produce physically valid inputs. For a strict human-only CTF, publish supervision/recording and organizer-review rules. Do not automatically disqualify keyboard players from heuristics alone.

Private input records are in `data/audit.jsonl`; valid laps are in `data/laps.jsonl`.

```sh
npm run review -- SESSION_ID
npm run scores
npm run check
npm test
```

Review replays the recorded version/seed/controls, checks sequence/tick continuity and reports laps, input hashes and control-change rates as evidence. Scores exports best-per-entry JSON for an organizer's CTF scoreboard adapter. No external CTF integration or flag distribution is included.

Tests cover rejected legacy fence chords at the hairpin, independent clearance checks of the actual scenery safety segments and low prop footprints, finite model geometry, normal lengths, UV bounds, assembled dimensions, local livery/tyre assets, A/D screen direction, repeated contact preserving lap validity, one-use DRS (including held keys across the line), control/physics behavior, single-lap rounds, timing gates/invalidation, replay determinism, points/ties, authentication, malicious client times, expiry, persistent best scores, three-round limits across server restarts, private-route protection, organizer tools and the UI lifecycle using DOM/WebGL stubs.

The eight shaders and fifteen actual 3D views can be checked with an offscreen EGL/GLES context, including the car from the front, both sides, rear and top, its cockpit and open DRS, showroom reflection, onboard visibility, sponsor mapping, shadow filtering, tunnel, waterfront and overhead views of the hairpin/chicane boundaries. Reproduce the previews with `node scripts/capture-model.mjs --track` followed by `python3 scripts/render-capture.py`; native development requirements are listed in `output/previews/README.md`. A complete browser/human-driven lap still needs testing on your host. Offscreen rendering does not validate browser layout or human driving feel.

## Free static hosting on Render

The current deployment target is a free **Static Site**. It includes all eleven cars, tyre choices, manual driving, DRS, graphics/audio, three guest qualifying rounds with the best time saved on that browser, and unlimited practice. It hides ranked event selection, token entry, shared timing and the ranked briefing, and does not request any `/api` endpoints. Browser-local records are unverified and do not produce a shared CTF classification.

The default `render.yaml` now describes only this static site. The paid Node service configuration is preserved separately in `render-ranked.yaml`. No server, disk, `HOST`, `PORT`, `DATA_DIR` or player-token provisioning is required for the static preview. Render static sites are free to deploy within their included usage limits. [Render Static Sites](https://render.com/docs/static-sites).

### 1. Build and check the preview

```sh
cd "/home/nafim/Desktop/DUCTF 2026/GP/apex-gp"
npm run build:static
npm run check
npm test
```

`build:static` copies only public game files from `dist/` into `static-dist/` and marks that copy as a static preview. The server source stays in server mode. Publish **`static-dist`**, rather than raw `dist`, so visitors cannot select the unavailable ranked service. The generated directory is ignored by Git and rebuilt by Render.

### 2. Push the changes to the existing GitHub repository

If the repository is already connected to GitHub, run:

```sh
git add .gitignore package.json render.yaml render-ranked.yaml README.md
git add dist/game.js dist/index.html scripts/build-static.mjs tests/static-build.test.mjs tests/ui.test.mjs
git diff --cached --stat
git commit -m "Prepare free Render static preview"
git push
```

Review staged files before committing; do not force-add `data/` or access tokens. If you have not created/pushed the GitHub repository yet, follow the repository setup commands in the ranked guide below, adding both `render.yaml` and `render-ranked.yaml` to that commit.

### 3. Create a Static Site in Render

Cancel the pending paid Blueprint setup, then choose **New → Static Site** in [Render](https://dashboard.render.com/). Connect the GitHub repository and use:

| Setting | Value |
| --- | --- |
| Name | `apex-gp-preview` or another available name |
| Branch | `main` |
| Root Directory | Blank if `package.json` is at the repository root |
| Build Command | `npm run build:static` |
| Publish Directory | `static-dist` |
| Environment variables | None required; optional `SKIP_INSTALL_DEPS=true` skips unnecessary dependency installation |

If the GitHub repository instead contains a parent `GP` directory with `apex-gp` inside it, set Root Directory to `apex-gp`; keep the build command and Publish Directory as shown. Do not choose Web Service or attach a disk.

Click **Create Static Site**, wait for Live, and open the exact HTTPS URL Render supplies. It will resemble `https://apex-gp-preview-xxxx.onrender.com`. You can also use a Blueprint with the default `render.yaml`; it contains no paid service or disk. Manual Static Site creation is the direct route from the dashboard.

### 4. Verify the preview

In a desktop browser, check the car/tyre selection, guest qualifying and practice under Driver settings. Ranked event mode, access tokens and the Timing button should be absent. Reopening the same site/browser retains used guest rounds and the best time. A different browser or clearing site data gets a separate guest record. Practice does not use a guest round.

Optional terminal checks, replacing the example hostname:

```sh
curl -I https://YOUR-SITE.onrender.com/
curl -fsS https://YOUR-SITE.onrender.com/ | rg 'apex-hosting.*static'
```

HTTP 200 is expected for the page. There is no `/api/health` or shared leaderboard on a Static Site; those checks belong to the optional Node server below. Custom domains and HTTPS are supported by Render; the supplied URL is enough to share the preview.

For later changes, push to the connected branch and let Render rebuild the static site (automatic deployments are enabled in the static Blueprint). The preview has no server records to migrate. Choose Performance graphics if a player's browser needs a lower rendering resolution.

### Custom domain: aanafim.xyz

The static Blueprint includes `aanafim.xyz`. Render performs the build remotely;
no game server or build needs to run on your laptop. The GitHub repository can
remain private: grant Render's GitHub app access to this repository.

If creating the site manually, use `npm run build:static` as the build command
and `static-dist` as the publish directory, then add `aanafim.xyz` under the
service's **Settings → Custom Domains**. If using the Blueprint, push
`render.yaml` first and select that file when creating the Blueprint.

Once the site is live at its assigned `onrender.com` address, follow the DNS
records shown by Render for `aanafim.xyz` and its `www` alias, then select
**Verify**. The exact apex record depends on your DNS provider; follow
[Render's provider instructions](https://render.com/docs/configure-other-dns).
Render issues and renews HTTPS certificates after successful verification.
Adding the domain to this file does not change your DNS or deploy the service.

This public site supports unlimited practice and three browser-local guest
qualifying rounds. It does not enforce team-wide attempts or submit rCTF scores.
The rCTF competition still requires the separately deployed persistent
coordinator and team instances described in `deploy/rctf/README.md`.

## Ranked server hosting on Render

This is the optional paid path for a future ranked event. For the current free preview, use the static instructions above. Deploy the complete Node application. The browser draws the game; the Node server serves the assets, verifies ranked input and stores event records. The supplied `render-ranked.yaml` creates one paid Node web service in Singapore with a 1 GB persistent disk, Node 24, a health check and manual deployments. Review the displayed price before creating it. Render's free web service cannot attach the persistent disk needed by this file-based event store. See [Render web services](https://render.com/docs/web-services), [persistent disks](https://render.com/docs/disks) and [Blueprints](https://render.com/docs/infrastructure-as-code).

### 1. Check the project locally

Run these commands in your ordinary terminal, not the restricted coding sandbox:

```sh
cd "/home/nafim/Desktop/DUCTF 2026/GP/apex-gp"
node --version
npm run check
npm test
```

Install/use Node 24 if necessary. There are no npm dependencies and no frontend build step; the committed `dist/` folder already contains the game. Python, EGL, image generation and native preview tools are not needed on Render.

### 2. Put this project in a private GitHub repository

On GitHub, create a new private repository named `apex-gp`. Leave the initialization options for README, license and gitignore unchecked so it starts empty. Then run the commands below from the project directory, replacing `YOUR_GITHUB_USERNAME` with your account name. They publish the source and test fixtures, while keeping local event records and generated screenshots out of the commit.

```sh
git init
git add .gitignore .node-version render-ranked.yaml package.json server.mjs README.md LICENSES.md
git add dist scripts tests output/models artwork-prompt.txt material-prompts.txt facade-v3-prompt.txt
git status --short
git diff --cached --stat
git commit -m "Prepare APEX GP for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/apex-gp.git
git push -u origin main
```

Review the staged files before committing. Do not force-add `data/`, access tokens or other credentials. GitHub authentication may be required when pushing. If `origin` already exists, inspect it with `git remote -v` and use `git remote set-url origin ...` only if you intend to change its destination. If Git asks for your identity, set your actual name/email with repository-local `git config user.name` and `git config user.email`, then retry the commit.

The repository root must contain `package.json`, `server.mjs`, `render-ranked.yaml`, `dist/`, `scripts/`, `tests/` and `output/models/`. The model export is included because model tests read it. With this layout, Render's Root Directory is **blank**, not `apex-gp`. If you instead upload the parent `GP` directory with an `apex-gp` subfolder, the Blueprint path must be `apex-gp/render-ranked.yaml` and its service must set `rootDir: apex-gp`.

### 3. Create the Render service

1. Sign in to [Render](https://dashboard.render.com/) and connect the GitHub account containing the repository.
2. Choose **New → Blueprint** and select the private repository, granting Render access if requested.
3. Select branch `main`; the Blueprint file path is `render-ranked.yaml`.
4. Review the proposed service and disk. The file selects the paid `1c-2g` compute plan (1 CPU, 2 GB RAM), one instance, Singapore and a 1 GB disk. Choose another supported region in `render-ranked.yaml` before the first creation if your players are elsewhere. This is a starting configuration, not a measured concurrency guarantee.
5. Apply/create the Blueprint. The build runs the JavaScript checks and Node tests, then starts the server. Wait until the service is Live.
6. Open the exact HTTPS address shown in the service dashboard, usually shaped like `https://apex-gp-monaco-xxxx.onrender.com`.

The Blueprint sets the following values. If you use **New → Web Service** manually instead of a Blueprint, enter these same settings and attach the disk before players enter the event.

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root Directory | Blank with the repository layout above |
| Build Command | `npm run check && EVENT_ID=monaco-2026 npm test` |
| Start Command | `npm start` |
| Node version | `24` via `.node-version` |
| Health Check Path | `/api/health` |
| HOST | `0.0.0.0` |
| NODE_ENV | `production` |
| DATA_DIR | `/var/data/apex-gp` |
| EVENT_ID | `monaco-2026` |
| EVENT_SEED | `2026` |
| Persistent disk mount | `/var/data` |
| Disk size | 1 GB initially; monitor audit growth |
| Instances | 1 |
| Auto-deploy | Off |

The build command pins only the test fixture event to `monaco-2026`; your running server still uses the configured `EVENT_ID`. It does not need access to the persistent disk during the build.

Leave `PORT` unset: Render supplies it and the server already reads it. Render handles public HTTPS; do not add `:5174` or `:10000` to the public URL. The local start command defaults to port 5174 only when no `PORT` is provided. [Render port binding and HTTPS](https://render.com/docs/web-services#port-binding).

### 4. Verify the public deployment

Replace the example hostname below with the dashboard's actual address, then run these commands on your own computer:

```sh
curl -fsS https://YOUR-SERVICE.onrender.com/api/health
curl -I https://YOUR-SERVICE.onrender.com/
curl -fsS https://YOUR-SERVICE.onrender.com/api/leaderboard
```

The health endpoint should return JSON with `ok: true`, `version: "monaco-2026-v3"` and `event: "monaco-2026"`. The page should return HTTP 200; an unused event board has an empty `entries` array.

Open the public address in a desktop browser. Select practice in **Driver** settings and drive it first: check car selection, tyres, W/S, A/D, manual shifts, the once-per-lap DRS, cameras and audio. Graphics run on each player's computer. If needed, choose **Driver → Graphics → Performance**. Keep the public browser window focused during ranked rounds.

### 5. Create player access tokens on the running server

Open the service's **Shell** page in the Render dashboard. Use the live service shell, not a build command, pre-deploy command, one-off job or ephemeral shell: those do not provide the live persistent disk. Dashboard shells are available for paid web services. [Render shell access](https://render.com/docs/ssh), [disk availability](https://render.com/docs/disks#disk-limitations-and-considerations).

The shell opens in the service's working directory. Run:

```sh
pwd
ls package.json
printenv DATA_DIR
npm run team -- "Organizer Test Driver"
npm run team -- "Team Alpha"
npm run team -- "Team Beta"
```

`DATA_DIR` should be `/var/data/apex-gp`. Run team creation sequentially. Each command prints that entry's token once; copy it directly to its player through your private event channel. Tokens are hashed in `teams.json`, and no server restart is needed to recognize a new entry. Duplicate team names are rejected. Use the same token for a team only if its members should share the three-round allowance.

For each player: open the public URL → **Driver** → **Event qualifying** → paste their access token → Save → select car/tyre → Go. Test using the organizer's separate token before distributing participant tokens. A started, abandoned or interrupted ranked round consumes an attempt, so use practice for unrestricted testing.

Verify that a completed valid ranked lap appears in **Timing**, that remaining rounds decrease, and that a fourth round is refused. Optional authenticated status checking in a local terminal (type the token at the hidden prompt, rather than putting it into shell history):

```sh
read -r -s -p 'Player token: ' apex_player_token
curl -fsS -H "Authorization: Bearer ${apex_player_token}" https://YOUR-SERVICE.onrender.com/api/driver
unset apex_player_token
```

### 6. Preserve data and manage the event

Private durable records live under `/var/data/apex-gp`:

| File | Purpose |
| --- | --- |
| `teams.json` | Entry names and token hashes |
| `rounds.jsonl` | Used qualifying rounds |
| `laps.jsonl` | Accepted lap results |
| `audit.jsonl` | Recorded controls and session events |

Only create the service once for this event. Keep the disk, `DATA_DIR`, `EVENT_ID`, seed and simulation version consistent. A new event ID starts a separate results/rounds namespace; it does not erase old files. Copying source into GitHub does not migrate existing local `data/`. To carry local results across, transfer a consistent backup of those files to the disk before anyone starts a hosted round, retaining the original event/version/seed. Do not overwrite a live event with older files.

Use the live Shell to export current scores or replay a recorded run:

```sh
npm run scores
npm run review -- SESSION_ID
```

Scores uses the configured event ID and simulation version. Review takes an actual session ID from the audit, and verifies recorded input rather than accepting a client time. CTF scoreboard integration and flag distribution are separate from this game; `npm run scores` outputs JSON for your own adapter.

For a consistent manual backup, wait until no one is driving or provisioning entries, then run this in the live Shell:

```sh
tar -C /var/data -czf /tmp/apex-gp-data-backup.tar.gz apex-gp
```

Download the archive privately using the service's SSH/SCP access. `/tmp` is temporary, so an archive left there is not a backup across redeploys. Render also supplies disk snapshots; use the service's disk controls for platform recovery. [Disk backup and transfer](https://render.com/docs/disks).

There is a maximum of 24 active ranked sessions in the current server. Check expected event load before the competition; the limit is a code setting, not a demonstrated performance guarantee. More CPU/RAM on the same instance can help, but horizontal replicas require a shared store and session coordination that are not implemented here. Valid-token authentication has a separate 30-per-minute budget for each player; failed tokens remain throttled by the directly observed peer address. A shared proxy/NAT no longer causes all valid players to share one login budget.

### 7. Update the game outside qualifying rounds

Commit/push reviewed changes to GitHub. Because automatic deployments are off, then use the service's **Manual Deploy → Deploy latest commit** control at a quiet time. The persistent disk remains attached, but restarting the Node process ends active runs and keeps the consumed attempts. Disk-backed Render services briefly stop during a deploy, so schedule updates outside competition runs. [Render disk deployment behavior](https://render.com/docs/disks#disk-limitations-and-considerations).

Recheck `/api/health` and the event leaderboard afterward. Do not delete the service/disk to publish an update. Avoid changing `EVENT_ID` or simulation `VERSION` merely for cosmetic updates.

### 8. Add a domain if desired

The Render HTTPS URL is enough to share the game. For a domain you own, open the service's **Settings → Custom Domains**, add a subdomain such as `gp.yourdomain.com`, and copy the DNS values Render supplies into your DNS provider. Complete verification and wait for the certificate, then test the new HTTPS address. Keep the game and API together on that same hostname. [Custom domains](https://render.com/docs/custom-domains).

### Troubleshooting

| Symptom | Check |
| --- | --- |
| `ENOENT` for `package.json` | Root Directory is wrong. It is blank for the Git repository described above. |
| Failed model test / missing GLB | Commit `output/models/` as well as `dist/`, `scripts/` and `tests/`. |
| No open port / 502 | Use a Node Web Service, `HOST=0.0.0.0`, `npm start`, and the platform's `PORT`. Read service logs. |
| `EACCES` writing event data | Confirm the disk is attached at `/var/data` and `DATA_DIR=/var/data/apex-gp`. |
| No Shell tab | Use a paid web service; free services and static sites do not provide the required shell/disk workflow. |
| Token rejected | Create it in the live hosted Shell, with the hosted `DATA_DIR`; a token generated only on your laptop is not automatically uploaded. |
| `Origin not allowed` | Serve the page and `/api` from one public hostname; a custom proxy must preserve the public `Host` header. |
| Ranked round unexpectedly ended | Ranked play ends on focus loss, tab hiding, pause, inactivity or a server restart. |
| Attempts/results disappear | Check the disk, `DATA_DIR`, `EVENT_ID` and version; do not reset these during the event. |
| The track takes time to load | Circuit geometry is prepared in the browser. Wait for preparation, enable hardware acceleration, or choose Performance. |
| Too many qualifying slots | The current application caps active sessions at 24; schedule participants or update/test the backend capacity. |

This guide prepares a deployment; it does not create a Render service or publish the game from the local workspace. I/O tests run without binding a port because the coding sandbox prohibits listening sockets. Complete the public browser/practice/ranked checks above after deploying.

## Sources and assets

- [2026 visual references, Formula 1](https://www.formula1.com/en/latest/article/gallery-new-look-new-tech-new-rules-f1-reveals-renders-of-the-innovative.4DYoUzwNaKhW9aQeeVXJMv). Viewed as reference only; no external model binary was imported.
- Sponsor name references: [Ferrari / Shell](https://www.ferrari.com/content/dam/ferrari-fcom/old/pdf/FNV_PR_Shell_ENG_.pdf), [IBM / Ferrari](https://newsroom.ibm.com/2024-11-07-ibm-selected-as-official-fan-engagement-and-data-analytics-partner-for-scuderia-ferrari-hp), [McLaren / Mastercard](https://www.mclaren.com/racing/partners/mastercard/), [Red Bull / Visa](https://www.redbullracing.com/int-en/oracle-red-bull-racing-and-visa-renew-global-partnership), [Mercedes partners](https://www.mercedesamgf1.com/partners), [Williams / Komatsu](https://www.williamsf1.com/articles/f88859b9-53f2-4fd2-bf9a-60f2ae827315/komatsu-and-atlassian-williams-f1-team-build-for-the-future-with-global-partnership-renewal), [Aston Martin / Cognition](https://www.astonmartinf1.com/en-GB/news/announcement/aston-martin-aramco-signs-cognition), [Haas / Toyota Gazoo Racing](https://haasf1team.com/partners/toyota-gazoo-racing), [Alpine / Eni](https://www.alpinef1.com/news/bwt-alpine-formula-one-team-and-eni-join-together-in-historic-collaboration), [Audi partners](https://www.audif1.com/en/partners), [Cadillac / TWG AI](https://www.cadillacf1team.com/news/twg-ai-joins-the-cadillac-formula-1-r-team-as-primary-and-exclusive-ai), and [Formula 1 partners](https://www.formula1.com/en/information/formula-1-partners.2shz7bIVhGgS3ovP69N3Rs). These inform the illustrative branding; no official logo files were downloaded.
- [2026 grid, Formula 1](https://www.formula1.com/en/latest/article/2026-line-ups-confirmed-in-full-who-is-on-the-grid-for-next-season.3TyLfOUjOwpBKOp3KX1PiS).
- [2026 power units and overtake mode, Formula 1](https://www.formula1.com/en/latest/article/2026-regulations-explained-all-you-need-to-know-about-f1s-new-power-units.14jfv7a36905uDJDdNyfQd.html).
- [2026 Monaco event, Formula 1](https://www.formula1.com/en/racing/2026/monaco).
- [Monaco centreline, Tomislav Bacinger / f1-circuits](https://github.com/bacinger/f1-circuits/blob/master/circuits/mc-1929.geojson), used under MIT; license in `LICENSES.md`. Coordinates are projected/interpolated and normalized to 3,337 m.
- `dist/assets/monaco-facades.webp` was generated with built-in imagegen; the exact prompt is in `facade-v3-prompt.txt`. It supplies four architectural families in a 2048² atlas. The earlier `monaco-facade.webp` is retained as a project artifact.
- `dist/assets/racing-materials.webp` was made with built-in imagegen; exact final prompts are in `material-prompts.txt`. Asphalt, stucco, carbon and concrete runtime tiles were prepared from the atlas at power-of-two sizes for mipmapping/repeat sampling. These are generated material maps, not photographs of a licensed track.
- The previous `monaco-qualifying.webp` artwork and `artwork-prompt.txt` are retained as project artifacts. The new landing page uses the actual 3D car instead of that image.

Independent community racing challenge; not affiliated with Formula 1 or its teams.
