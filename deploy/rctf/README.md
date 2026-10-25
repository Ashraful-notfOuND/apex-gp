# APEX GP on rCTF: one race per instance

The competition uses rCTF Dynamic/Webhook scoring and one shared, persistent
coordinator. Each team instance is a stateless HTTP gateway. The static Render
preview is a separate local-play build and does not enforce these event rules.

## Competition rules

- Creating a Kubernetes instance registers its team with time **∞**, rank **—**
  and **0 points**, even before sign-in. JSON uses `null` for the unclassified time.
- Sign in with rCTF, choose a car and tyres, then start **one race per instance**.
  A race is a short out-lap and one flying lap, with a ten-minute maximum.
- Any recorded wall impact invalidates and ends the race immediately, including
  during the out-lap. Abandoning the race, losing live timing or restarting the
  coordinator also consumes this instance's allowance.
- Practice and guest qualifying are hidden in competition instances. Changing
  the browser's mode field cannot start a practice or second official race.
- A valid time replaces the team's personal best only when it is faster. A
  slower, invalid or abandoned race never erases a previous best.
- After the result is saved, the coordinator queues instance deletion through
  rCTF after a two-second response grace period. Create a new instance to race
  again. There is no three-attempt limit across instances.
- The fastest distinct valid time receives **1,000 points**, the slowest **200**.
  Intermediate distinct times receive `round(1000 - 800 * index/(count - 1))`.
  Equal millisecond times share points/rank. One finisher or an all-tied field
  receives 1,000 each. Unclassified teams remain below finishers at 0 points.

This is lap-ranking scoring, rather than points accumulated for holding first
place. The authoritative server replays controls at 120 Hz and ignores client
lap times, positions and scores. It cannot establish whether a human supplied
the controls; any human-only event needs organizer rules and review.

## Hosts and image

Keep your existing rCTF and Kubernetes instancer. Deploy one coordinator process
with persistent storage, public HTTPS and outbound access to rCTF. Do not put it
inside the temporary team instance. The Compose file starts with a 2 CPU / 2 GB
allocation; capacity must be measured against the expected concurrent races.

Example addresses:

| Purpose | Example |
| --- | --- |
| rCTF | `https://mock.ductf.com` |
| Coordinator | `https://timing.aanafim.xyz` |
| Public central board | `https://timing.aanafim.xyz/leaderboard` |
| Team gateway | `https://apex-gp-<uid>.<existing-instancer-domain>` |

The coordinator hostname is a proposed address, not automatically configured.
Set its DNS and HTTPS routing before using it. Kubernetes gateways need public
coordinator connectivity because the standard instancer egress policy blocks
private address ranges.

Publish the current source using `.github/workflows/publish-image.yml` with tag
`ctf-v2`; see [PUBLISH-ON-GITHUB.txt](PUBLISH-ON-GITHUB.txt). This tag does not exist
until the workflow succeeds. Use the same published tag or immutable digest for
both coordinator and gateways. A private GHCR image needs credentials on the
coordinator host and registry access in instancer-created namespaces. The GitHub
repository can remain private.

## Coordinator environment and sign-in

On the remote coordinator host:

```sh
cp deploy/rctf/.env.example .env
chmod 600 .env
```

Fill every placeholder in `.env`. `RCTF_CHALLENGE_ID` must be the actual rCTF
challenge ID, not its display name or an unrelated integration ID. Set
`INSTANCE_DOMAIN` to the existing instancer's suffix and `INSTANCE_PREFIX=apex-gp-`.
Set `EVENT_START` and `EVENT_END` to the event's actual timezone-qualified ISO
values, for example `2026-11-01T09:00:00+06:00`. Keep the event ID and seed stable.

Register an external app under rCTF `/admin/settings`:

```text
Name: APEX GP
Redirect URI: https://YOUR-COORDINATOR/auth/rctf/callback
```

Copy its client UUID and secret into `RCTF_CLIENT_ID` and `RCTF_CLIENT_SECRET`.
The callback must exactly match `COORDINATOR_PUBLIC_URL` plus the path above.

Use three separate secrets: `RCTF_SCORING_SECRET` (also in the rCTF challenge),
`APEX_COOKIE_SECRET`, and `APEX_GATEWAY_KEY` (also in the gateway configuration).
Generate independent values with `openssl rand -hex 32`. Never place scoring,
client or cookie secrets in team gateways or the static-site environment.

The external-app flow supplies a normal rCTF team bearer token. To stop that
team's instance, the coordinator keeps it encrypted with AES-256-GCM on its
private persistent volume. The encryption key is derived from the cookie secret
and event namespace. The credential is removed after shutdown, expiry or
supersession. It is never sent to the browser or gateway, or logged in plain text.
Keep the cookie secret and data volume stable through coordinator restarts.

With Docker Compose available on the remote host:

```sh
docker compose --env-file .env -f deploy/rctf/compose.yaml config --quiet
docker compose --env-file .env -f deploy/rctf/compose.yaml pull coordinator
docker compose --env-file .env -f deploy/rctf/compose.yaml up -d --no-build coordinator
```

Route the coordinator HTTPS hostname to its loopback port `8081` using the
server's existing proxy. On a dedicated host with ports 80/443 available, the
optional Caddy profile can supply HTTPS instead:

```sh
docker compose --env-file .env -f deploy/rctf/compose.yaml --profile https up -d --no-build
curl -fsS https://YOUR-COORDINATOR/healthz
```

## rCTF challenge editor

| Setting | Value |
| --- | --- |
| Name | APEX GP — Race the Clock |
| Category | misc |
| Scoring | Dynamic |
| Source transport | Webhook |
| Source secret | Same value as `RCTF_SCORING_SECRET` |
| Points min/max | 200 / 1000 (coordinator owns the calculation) |
| Flags | Empty |
| Tiebreak eligible | False |
| Instancer | Existing Kubernetes provider |
| Integration ID | `apex-gp` |
| Lifetime | `3600000` milliseconds / one hour |
| Extendable | True |
| Initial visibility | Hidden during preparation |

Set the exposed endpoint to **https / prefix apex-gp / pod game / port 8080**.
Paste [instance-kubernetes.yaml.example](instance-kubernetes.yaml.example) into
**Instancer config**. Fill in the published image reference, both coordinator
URLs and gateway key. Keep both downward-API environment settings:

- `RCTF_EXPOSED_HOSTNAMES` reads `rctf.osec.io/exposed-hostnames`.
- `RCTF_INSTANCE_NAMESPACE` reads `metadata.namespace`. The rCTF operator's
  `inst-<challenge-id>-<team-UUID>` namespace identifies the owning team at startup.

The gateway registers the owner using an authenticated internal coordinator
route, and the coordinator resolves the name from rCTF's public team profile.
Public profiles are gated until rCTF starts, so test startup in an open staging
CTF window. Registration retries if rCTF or the coordinator is unavailable.
Sign-in separately verifies ownership of that exact running public endpoint.

The Docker generator (`npm run ctf:challenge`) remains Docker-provider-specific.
For a Docker deployment without team metadata injection, registration is completed
at rCTF sign-in. To register before sign-in, trusted provisioning must supply
`RCTF_TEAM_ID`; the Kubernetes configuration already supplies the owner via the
namespace. Do not use the Docker generator to overwrite a Kubernetes challenge.

## Lifecycle and persistence

`rounds.jsonl` durably records the consumed public instance origin. A renewed
login, browser reload, process restart or repeated start request cannot reset it.
`laps.jsonl` retains valid laps and the minimum per team. `ctf-teams.jsonl` retains
all registered teams. Encrypted lifecycle records and the score publisher outbox
also live in `DATA_DIR`. Back up this volume and `.env` privately; never run
multiple coordinator processes against the same files.

A background sweep closes idle races after twelve seconds without live inputs.
It also closes interrupted races recovered after a coordinator restart. The
lifecycle worker retries failed rCTF shutdowns with bounded backoff. It checks
the current team's endpoint before deletion and drops old work when a replacement
instance is observed. The participant stop API has no documented conditional
instance-ID parameter, so administrators should avoid manually stopping and
recreating an instance in the middle of a shutdown request.

The score publisher checks every two seconds, sends signed absolute per-team
scores when they change, retries uncertain deliveries and durably freezes the
classification at `EVENT_END`. Shutdown cleanup continues after that deadline.
The public `/leaderboard` page refreshes every two seconds and remains available
after a team gateway has been deleted.

Simulation version **v4** introduces crash invalidation and instance-scoped race
quotas. Start a fresh event/challenge, or have an organizer clear old staging
scores before opening the new format; do not mix v3 competition results with v4.
No existing competition records are deleted by this application upgrade.

## Staging checks

1. Open two team instances: both appear immediately at ∞ / 0 on `/leaderboard`.
2. Sign in and start a race; concurrent/repeated starts on that instance fail.
3. Crash on the out-lap or timed lap: the race ends with no valid time and the
   instance is deleted. A prior team best remains unchanged.
4. Complete a valid lap, then create fresh instances and record slower/faster
   times: only the faster time replaces the team's best.
5. Reload, change cars, sign out/in or restart the coordinator after starting:
   the original instance cannot grant a second race.
6. Abandon the page: the idle sweep closes the race without a finish request.
7. Test a temporary rCTF failure: shutdown and score delivery retry after recovery.
8. Confirm rCTF points, ties and final-deadline freeze before releasing the challenge.

Official references: [dynamic scoring](https://rctf.osec.io/admin/scoring/),
[external apps](https://rctf.osec.io/admin/external-auth/),
[Kubernetes instancer](https://rctf.osec.io/integrations/instancer/kubernetes/),
[instance lifecycle API](https://rctf.osec.io/api/integrations/instance-status/).
