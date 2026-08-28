# Design brief — DATS Array Monitor, operator dashboard

Design a single-screen operator dashboard for a satellite ground station's phased-array
console. I'm attaching a screenshot of what exists today. Read it as a starting point, not
a specification — if you see a better arrangement that serves the operator, propose it.

Design this from the operator's chair, not from the code. I don't want a prettier version
of the current screen; I want the screen an operator can sit in front of for an eight-hour
shift and always know what the array is doing.

## Who is looking at this

A ground-station operator on shift at Bengaluru (ISTRAC). They drive one aperture:
DATS-09, a 24×24 S-band phased array — 576 dual-polarised radiating elements, partitioned
into nine 8×8 subarray tiles labelled A1–A3, B1–B3, C1–C3. Up to 72 beams can be loaded
across those tiles, and each beam is assigned to a satellite pass.

This person is not a developer and not an RF engineer. They are watching, not building.
The screen lives on a wall-mounted or desk display in a dim operations room, at roughly two
metres. It is open all day. They glance at it constantly and study it rarely.

## The problem I'm trying to solve

Two problems.

**One: the picture is scattered across four pages.** Array health, chassis detail, RFSoC
boards and site infrastructure each have their own route today. An operator who wants to
know whether the array is healthy has to navigate to assemble that answer, and by the time
they've assembled it they've lost the thing they were watching. Collapse this to **one
page**. Nothing that matters may be behind a navigation. Deeper hardware detail — a
chassis, an RFSoC board, the clock/power/cooling/data chain — should surface as a panel,
overlay or expanding rail *on this same screen*, so the operator never loses their place.

**Two: the screen shows hardware but not mission.** Right now the operator can see how the
array *feels* — temperatures, PLL locks, VSWR, phase error — but not what it is *doing*.
They cannot tell which satellites are being tracked, where the beams are pointed, what's
queued next, or how many passes are coming. A healthy array pointed at nothing is not a
success, and this screen currently cannot tell those two states apart. The dashboard has to
carry both: the machine and the mission, side by side.

## What the operator has to be able to answer

Design against these, in this order. If a layout answers the five-second questions without
the operator moving their eyes deliberately, it's working.

**In five seconds, without focusing:**
- Is the array healthy, degraded, or in trouble?
- Are we transmitting right now?
- Is anything demanding my attention this minute?

**In thirty seconds, with a deliberate look:**
- Which satellite are we tracking right now, and how far into the pass are we?
- Where are the beams pointed — how many are up, on what, and is any of them running out
  of sky?
- What's next, and how soon?
- Which tile is unhealthy and does it threaten the current pass?

**In two minutes, when something is wrong:**
- Which element, slot, board or service is the actual fault?
- Is this one bad element or a common-mode failure across a row?
- Can I finish the pass I'm on, or do I need to hand off?

## Composition I have in mind

Roughly 70 / 30 across the screen. Argue for which side the 30% column belongs on — make
the case from scan order and from where an operator's attention naturally rests, not from
what the current screen happens to do.

**The 70% region — the array itself.**
Keep the nine-tile subarray grid and the per-tile parameters that are there today: chassis
temperature, DC draw, beams loaded, PLL locks, phase RMS, VSWR, fan and Aurora link state,
plus the 8×8 element heat map inside each tile card and the gain/phase metric toggle and
H/V feed filter above it. That density is correct and operators rely on it — don't thin it
out in the name of cleanliness. What I want improved is the hierarchy: right now nine
healthy tiles and one degraded tile are drawn with almost equal weight, and the degraded one
should pull the eye without shouting.

**The 30% column, upper half — the aperture and its field of view.**
This is the piece that doesn't exist yet and matters most to me. Show the 24×24 aperture as
a physical panel, and show the beams projecting off it as cones into the sky — the field of
view, seen from slightly above and to the side so the geometry reads as three-dimensional.
The operator should be able to look at this and immediately see:

- how many beams are formed and roughly where each is aimed
- which satellite each beam is holding
- which beams are near the horizon, near a scan limit, or about to lose the target
- how beams are distributed across the aperture, and whether a degraded tile sits under any
  of them

This should feel like looking at the sky above the station, not like reading a chart. It is
the operator's mental model made visible. Use motion sparingly — beams that drift with the
pass are informative; anything that pulses or animates without meaning is noise on a screen
someone stares at for hours.

**The 30% column, lower half — what's running.**
The live task and mission board. Per active task: task ID, status, the satellite, which
beam or beams are assigned to it, link/lock state, elevation, and how much of the pass is
done. Above or alongside it, the counts that tell the operator the shape of their shift:

- satellites in the catalogue
- how many are visible from the station right now
- how many passes are scheduled — today, and in the next hour
- how many are being tracked at this moment
- how many are queued, and how many are in conflict

Statuses must be legible as a group. An operator should be able to sweep this half and know
"three tracking, six queued, one conflict" without reading a single row in full.

## Design a fault, not a happy path

Design the screen against a real moment rather than an idle one. The station's seeded
scenario is this: a clock splitter feeding row B has degraded. Three tiles on the same row
are drifting phase together. Tile B2 has crossed the phase-jitter limit, is running hot at
48.7 °C, has lost a PLL lock (7 of 8), and its VSWR has breached 1.50 — which trips the
transmit interlock on one element and reads as critical. Two elements are flagged: R3·C4
degraded, R6·C1 critical. Meanwhile a pass is in progress and beams are loaded.

Show me how that moment looks on this dashboard. The operator's real question in that
moment is not "which element is red" — it's *"is this one bad tile, or is my whole row
going?"* and *"can I finish this pass?"*. A design that makes the common-mode pattern
visible, and connects the hardware fault to the pass at risk, is the design I want.

## Constraints

- Dark operations room. Dark theme is the primary design; a light theme must also work.
- One screen. No vertical scrolling on the main dashboard.
- Colour carries meaning only. The existing health language is green = nominal,
  amber = degraded, red = critical, and a teal-ish brand accent for interactive elements.
  Nothing else should be coloured for decoration.
- Readable at two metres for the status-level information; fine detail may assume the
  operator has leaned in.
- Must scale from a 1440-wide laptop to a 4K wall display as one object — proportional
  sizing, not a stack of breakpoints.
- Numbers are glanced at, not read. Prefer typography and position over labels wherever
  an operator would already know what a figure means.

## What to produce

Artboards for the full dashboard, plus close-ups of the two halves of the 30% column and of
the drill-down panel that replaces the old chassis/RFSoC/infrastructure pages. Show the
fault state described above, and show a quiet nominal state alongside it so I can see how
much the screen changes between them.

Tell me what you decided and why — particularly the side you put the column on, how you
ranked the operator's questions, and anything in my description you think is wrong.
