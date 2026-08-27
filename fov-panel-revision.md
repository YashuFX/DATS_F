# Revision brief — Field of View panel

Redo the FIELD OF VIEW panel. The current version is attached. It looks like an
illustration of a phased array rather than an instrument an operator reads, and the
geometry in it is wrong in ways a ground-station operator would catch immediately. I want
this rebuilt on real antenna geometry, not on a visual metaphor.

## What is wrong with the current version

State these as things not to repeat:

1. **The beams radiate from a point.** A phased array forms its beam across the entire
   aperture face by phasing 576 elements — the energy leaves the whole panel, not a vertex
   at its centre. Cones fanning from a single point is a searchlight.
2. **A beam points below the horizon plane.** B04 goes down and to the left, under the
   array. Nothing a ground station tracks is underground.
3. **B04 is labelled GSAT-24, which is geostationary.** A GEO satellite sits at one fixed
   azimuth and elevation in the southern sky, permanently. It never moves and never sets.
   If a target is GEO, draw it parked; if it moves across the sky, it is not GEO.
4. **Two incompatible projections in one picture.** The sky is drawn as flat concentric
   ellipses; the beams are drawn in 3D perspective. The ring spacing does not correspond to
   the cone angles, so the 0° / 30° / 60° labels mean nothing. Pick one projection and be
   rigorous inside it.
5. **There are no satellites.** There are floating labels with leader lines pointing at
   empty space. An operator needs the target itself: where it is now, where it came from,
   where it is going, and when it hits the mask.
6. **Every beam is drawn the same width.** This is the largest omission — see the physics
   below. Beamwidth is the single most operationally relevant property of a steered beam
   and it varies by a factor of four across the usable sky.
7. **`AZ 360° · EL 5–85°` is written in the header and never drawn**, and it is also
   physically wrong for a fixed planar face — see "Decide this first".
8. **The aperture is an abstract slab** with two coloured squares. It carries no sense of
   576 elements, nine tiles, or which tile is degraded.
9. **Labels float outside the plot and collide** (B06 overlaps CARTOSAT-3). At two metres
   in a dark room this is unreadable.

## Decide this first

The header claims 360° azimuth and 5°–85° elevation coverage. A fixed 24×24 planar
aperture cannot do that. A planar array scans usefully to about ±60° off boresight; past
that the beam collapses, gain falls off a cliff, and grating lobes appear. If boresight is
at zenith, the reachable sky is elevations 30° and above — not 5°.

So one of two things is true, and the design must commit:

- **(a) Fixed panel.** Boresight at zenith, usable coverage is a **±60° cone** around it —
  full azimuth, elevation 30°–90°. The cone *is* the field of regard, and it should be the
  structural element of the picture. Everything below 30° elevation is drawn as unreachable
  sky, and the header should say `AZ 360° · EL 30–90°`.
- **(b) Panel on a positioner.** The aperture is mechanically pointed and electronically
  scans ±60° around wherever it is mechanically aimed. Then the field of regard is a cone
  that *moves*, and the picture must show both where the panel is currently pointed and how
  far it can steer from there without moving. This is richer and more honest if it matches
  the hardware.

Pick one, say which you picked, and draw it correctly.

## The real physics — use these numbers

- 24×24 elements at half-wavelength spacing, S-band (~2.2 GHz, λ ≈ 136 mm). The aperture is
  roughly **1.6 m square**.
- **Boresight beamwidth ≈ 4.2°** (0.886 λ/L for a 12λ aperture).
- Steering off boresight by angle θ:
  - the beam **broadens as 1/cos θ**
  - the gain **falls as cos θ**
  - the beam footprint becomes an **ellipse elongated radially**, not a circle
- Concretely: at boresight, 4.2° round. At 30° off, 4.9° × 4.2°, −0.6 dB. At 45° off,
  5.9° × 4.2°, −1.5 dB. At 60° off, 8.4° × 4.2°, −3 dB and at the practical limit.
- 72 beams available across nine tiles; a handful are typically up at once.

An operator looking at this panel should be able to see, without reading a number, which
beams are tight and strong near the top of the sky and which are fat and lossy near the
edge of the scan volume. That contrast is the reason this panel exists.

## What to draw — two linked views

### Primary: the sky, as a true polar az–el plot

Draw the sky the way every ground station in the world draws it, and drop the perspective
dome. Perspective looks impressive in a still image and costs the operator accuracy on
every reading.

- North at the top, azimuth clockwise around the rim, E / S / W marked.
- Elevation as radius: **zenith at the centre, horizon at the rim.** Rings at 30° and 60°,
  labelled once, quietly.
- **The field of regard drawn as a filled region** — the ±60° scan cone. Inside it is sky
  this array can reach; outside it is sky it cannot. This boundary should be the strongest
  structural line in the plot after the rim.
- Any terrain/horizon mask drawn as an irregular filled skirt at the rim, so the operator
  can see the azimuths where the site is blind.
- **Satellites as markers**, each with its track: dotted for the path already flown, solid
  for the path still to come, with tick marks at fixed time intervals so the operator can
  read speed and estimate time-to-LOS by counting. Mark AOS and LOS where the track crosses
  the mask.
- A GEO target, if present, drawn as a stationary marker with no track — visually distinct
  from anything moving.
- **Each active beam drawn at its true angular size** — a small circle near zenith, a fat
  radially-stretched ellipse near the scan limit. Do not draw them as icons of uniform
  size. This is the whole point of the panel.
- Beam colour carries link state only: locked, acquiring, degraded, lost. Not decoration.
- A beam whose target is approaching the scan limit or the mask should read as *about to
  be a problem* before it becomes one.

### Secondary: the aperture, small, beneath or beside

A compact view of the panel itself — the real 24×24 grid, nine tiles visible as groups,
face-on or in a slight tilt.

Its job is to connect the beam to the hardware. When a beam is selected in the sky view,
render **that beam's phase gradient across the aperture** — the wrapped linear ramp that
actually steers it. A beam near zenith shows a nearly flat taper; a beam near the scan
limit shows tight, closely spaced phase wraps. That is the physical mechanism, drawn
truthfully, and it is what makes this an instrument rather than an ornament.

Degraded tiles should show through as a disturbance in that ramp, so an operator can see
directly that the beam they care about is passing over the tile that is failing.

## Labelling

- Labels anchor to their marker with a short leader, or sit inside a compact numbered
  legend below the plot. Never crossing, never overlapping, never floating unattached.
- Beam ID and satellite name in one line, at one weight. The plot is the message; the
  labels are the index.

## Panel header

`FIELD OF VIEW` plus, in one quiet line: beams up against capacity (e.g. `6 / 72 BEAMS`),
and the actual reachable volume as decided above. If the panel is on a positioner, add the
current mechanical pointing.

## Constraints

- Dark ops room, glanceable at two metres for the structure, lean-in for the detail.
- This occupies the upper half of a 30%-width column — roughly a square. Design to that
  aspect ratio, not to a wide banner.
- Motion only where it means something: markers advancing along their tracks is
  informative. Nothing should pulse for atmosphere.
- Colour is meaning. Green nominal, amber degraded, red critical, teal accent for
  interaction. Nothing coloured because it looked flat.

Show the panel in two states: a quiet one with three beams up near zenith, and a busy one
with six beams up including two near the scan limit and one target about to set behind the
mask.
