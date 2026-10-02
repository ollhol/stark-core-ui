# J.A.R.V.I.S. Home Terminal

## Goal
Build a polished, responsive single-screen AI home terminal that feels like a cinematic Stark-style control system while remaining clear and usable.

## Experience
- Create a deep navy holographic interface with neon cyan illumination, restrained orange alerts, glass panels, fine grid lines, and subtle scanning/radar motion.
- Place the animated J.A.R.V.I.S. core prominently in the command area, with clear idle, listening, thinking, and response states.
- Adapt the composition from a dense desktop command center to a readable stacked mobile terminal without overlap or clipped text.

## Functional Modules
- **Command console:** timestamped boot logs, typed command submission, contextual mock replies, auto-scroll, and command history styling.
- **Core interaction:** clicking the core cycles through Listening with animated waveform bars, Thinking, then a generated mock response appended to the console.
- **System status:** live local clock/date plus gently fluctuating CPU, memory, network, and secure-firewall telemetry.
- **Smart home hub:** working switches for Lab Lights, Main Power Grid, Air Filtration, and Armor Maintenance Dock, with immediate visual status updates and console events.
- **Communications:** selectable incoming transmissions that open a message dialog with sender, priority, timestamp, and body.
- **Voice:** a persistent speech toggle using the browser’s speech synthesis, preferring an available British male voice and speaking new J.A.R.V.I.S. replies only when enabled.

## Technical Details
- Implement as the `/` screen with focused React components and browser-only state; no account or database is needed.
- Use existing design-system controls and Lucide icons for actions, metrics, switches, and status signals.
- Define all palette, glow, glass, animation, spacing, and typography styling as reusable semantic tokens in the global design system.
- Add page-specific title, description, Open Graph, and Twitter metadata.
- Respect reduced-motion preferences and handle unavailable speech synthesis gracefully.

## Verification
- Check idle → listening → thinking → response, typed commands, all device switches, message dialog, live telemetry, and speech toggle behavior.
- Inspect desktop and mobile layouts for readability, stable sizing, and no overlapping controls.
- Confirm the preview builds without errors and the central interactions work end to end.
