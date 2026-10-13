# AYONI STUDIO: Mobile Music Dashboard & Real-Time Pitch Correction Engine

Transform the workstation interface into an adaptive, mobile-responsive music production dashboard. Introduces a persistent bottom transport dock with a prominent armed Record button, a tabbed mobile navigation switcher (Studio Timeline, Pitch Tuner, and Mixer Console), and a dedicated real-time pitch correction rack with compact rotary knobs for key, scale, retune speed, and correction amount.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your selections in Phase 1, the following core UX architectural decisions are confirmed:

- **Confirmed Decision 1 (Mobile Navigation)**: A bottom mobile dock with quick tabs switching between **Studio Timeline**, **Pitch Tuner**, and **Hardware Mixer Console**, eliminating the cramped horizontal clipping on phones while keeping desktop widescreen mode intact.
- **Confirmed Decision 2 (Pitch Correction UI)**: Compact rotary knobs (`Retune Speed`, `Correction Amount`, `Humanize / Smooth`) paired with musical key (C through B) and scale (Major, Minor, Chromatic, Pentatonic, Dorian) dropdown selectors.
- **Confirmed Decision 3 (Persistent Mobile Controls)**: A high-visibility **Big Record Button** with live armed vocal status dot pinned to the bottom dock across all mobile views, flanked by Play/Pause and BPM readout.
- **Confirmed Decision 4 (Visibility of Core Controls)**: Pinned top and bottom toolbars ensure Play, Record, Import Beat, BPM, Mix/Master, and Pitch Correction are never cut off on smaller screens.

---

## 1. Overview & Core Concept

- **What It Does**: Resolves responsive layout constraints on mobile devices by replacing fixed-pixel desktop scaling with an adaptive studio dashboard. Users on phones and tablets can easily import beats, tap tempo, record vocals with armed track indicators, tweak pitch correction parameters in real-time, and balance channel faders.
- **Target Audience**: Mobile and desktop vocalists, producers, and songwriters who record quick takes or mix vocals on phones, tablets, or laptops without an external audio interface.
- **Key Value**: Core DAW operations (Record, Play, Import Beat, Auto-Pitch, BPM, Mix) are 100% accessible and one-tap away on any screen size.

---

## 2. User Experience & Visual Design

### Mobile Layout Structure
- **Persistent Mobile Top Bar**:
  - Logo (`AYONI`), Session title, quick BPM tap button, and file import (`+ Beat`).
- **Main Viewport Switcher** (Switched via bottom dock tabs):
  1. **Studio Tab**: Symmetrical neon mirror waveforms (Cyan, Purple, Red), red playhead line, track list, and time scrubber.
  2. **Pitch Tab**: Dedicated real-time Auto-Pitch rack with key selection, musical scale buttons, retune speed knob (0ms Travis hard-tune to 80ms organic natural), and correction amount.
  3. **Mixer Tab**: 4-channel hardware console with tactile faders, pan sliders, and live green LED VU meters.
- **Persistent Bottom Mobile Dock**:
  - Left: Quick Play/Pause button and BPM indicator.
  - Center: **Prominent Glowing Red Record Button** with active armed vocal indicator.
  - Right: Navigation tabs (`Studio`, `Pitch`, `Mixer`) and master Export button.

### Visual Styling & Theme
- **Color Tokens**:
  - Background: Deep charcoal studio casing (`#0f1015` and `#161720`).
  - Active Vocal Track: Electric Purple (`#a855f7`).
  - Beat Channels: Cyan (`#00f2fe`).
  - Harmony / Backing: Crimson Red (`#ef4444`).
  - Record State: Vibrant Rose (`#e11d48`) with glowing pulse ring.
  - Meters: Neon Green (`#10b981`).
- **Typography**: Inter / System Sans for clear controls, JetBrains Mono for musical telemetry (BPM, Bars, Time, Retune Speed).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Bottom Dock Switcher vs Single Compressed Screen**
  - *Chosen Approach*: Multi-tab mobile dock (`Studio`, `Pitch`, `Mixer`) while keeping desktop as a unified widescreen chassis.
  - *Why*: DAW timelines and 4-channel fader banks cannot legibly fit side-by-side on a 375px–430px mobile screen. Tabs allow each tool full touch targets ($\ge 44\text{px}$) without clutter.
- **Decision 2: Compact Rotary Knobs for Auto-Pitch**
  - *Chosen Approach*: Custom touch-friendly rotary knobs with numeric readouts for Speed and Depth, plus clean native select menus for Key and Scale.
  - *Why*: Takes minimal screen space while providing 0–100% precision control on touchscreens.
- **Decision 3: Pinned Armed Record Button**
  - *Chosen Approach*: Pinned to the center of the mobile navigation bar regardless of which tab is active.
  - *Why*: Allows singers to adjust Auto-Tune or Mixer faders and immediately hit Record without switching back to the timeline.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                           App.tsx                                │
│       (State: Project, Tracks, Recording, Playback, BPM)         │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
         ┌────────────────────────┴───────────────────────┐
         ▼                                                ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│     Desktop Widescreen        │        │      Mobile Studio View       │
│     (StudioWorkstation)       │        │     (Responsive Dashboard)    │
│  - Top Pill Transport Island   │        │  - Persistent Header Bar      │
│  - Left Track Channel Rail    │        │  - Active Tab:                │
│  - Center Neon Waveforms      │        │    • Studio Timeline          │
│  - Right Hardware Faders      │        │    • Compact Pitch Tuner      │
│                               │        │    • Hardware Mixer           │
│                               │        │  - Bottom Pinned Record Dock  │
└───────────────────────────────┘        └───────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Web Audio Engine (audioEngine.ts)              │
│    - Latency Compensation (-35ms)     - Multitrack Playback     │
│    - Parametric EQ & Compressor        - Master Limiter & LUFS   │
│    - MediaRecorder Vocal Capture       - Pitch Shifter DSP       │
└──────────────────────────────────────────────────────────────────┘
```

### Component Structure
1. **`StudioWorkstation.tsx`**: Add responsive media query breakouts: on mobile (`max-w-md` / screen width $< 768\text{px}$), render the Mobile Music Dashboard layout with bottom dock and tabbed views. On desktop ($\ge 768\text{px}$), preserve the exact widescreen hardware workstation casing.
2. **`components/PitchCorrectionPanel.tsx`**: Compact Auto-Pitch rack with:
   - Key selector (C, C#, D, D#, E, F, F#, G, G#, A, A#, B).
   - Scale selector (Major, Minor, Chromatic, Pentatonic, Dorian).
   - Rotary Knobs: `Retune Speed` (0–100%), `Correction Depth` (0–100%), `Humanize` (0–100%).
   - Direct two-way binding to `selectedTrack.effects.autotune`.
3. **`components/MobileNavDock.tsx`**: Persistent bottom bar containing:
   - Armed Record button (pulsing red when recording).
   - Play/Pause transport button.
   - Quick tab switcher (`Studio`, `Pitch`, `Mixer`).
   - BPM and Beat import triggers.
