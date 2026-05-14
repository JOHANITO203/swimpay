# Codex Design Workflow

This document defines SwimPay design workflows for Codex sessions.

SwimPay product truth always wins. Design workflows must not modify payment
runtime, backend APIs, database schema, webhook behavior, receiver runtime, SDK
behavior, notification processing or confirmation semantics.

## 1. Design Polish Mode

Use when the user asks for visual polish, screen matching, layout tuning,
spacing, colors, typography, components or mockup alignment.

Rules:

- Visual work only.
- No backend, API, database, webhook, payment runtime, receiver runtime, SDK or
  notification-processing changes.
- Preserve existing UI copy unless the user explicitly asks for copy changes.
- Do not add product-safety lectures to normal UI copy.
- Roborazzi is not blocking during active polish.
- Do not update goldens by default.
- Compile only when code changes are made.
- Use manual screenshots or device/browser captures for iteration evidence.
- Keep a short report in `.swimpay-agent`.

Recommended validation:

- Android Compose: `npm run android:compile`
- Hosted checkout/web visual-only changes: targeted typecheck or page render
  verification when available
- Docs-only design workflow changes: `git diff --check`

## 2. Visual Freeze Mode

Use only when the user approves the current visual direction or explicitly asks
to freeze visual baselines.

Rules:

- Record Roborazzi goldens for Android surfaces in scope.
- Verify screenshots after recording.
- Update visual diff reports with changed surfaces.
- Approve baselines explicitly in the closeout report.
- Do not use freeze to hide incomplete mockup mismatch.

Recommended validation:

- `npm run android:visual:record`
- `npm run android:visual:verify`
- Any hosted checkout screenshot record/verify command relevant to the surface

## 3. Full Visual Rebuild Mode

Use when the user says screens do not match mockups, asks for a full visual
rebuild, says the old theme is wrong, or asks to treat references as the visual
source of truth.

Rules:

- Rebuild the active UI layer from the mockups or visual reference.
- Treat old theme residue as a bug.
- Do not mix old light theme, stale gradients, legacy cards or obsolete
  navigation with the new design system.
- Preserve copy unless the user explicitly asks for copy changes.
- Do not rewrite product safety language during the rebuild unless the current
  copy is dangerous or the user requests copy work.
- Keep runtime state, contracts and payment decisions untouched.

Rebuild checklist:

- Identify active source files for the surface.
- Identify old visual tokens and residue to remove.
- Rebuild shared shell/components before per-screen details when the whole app
  is off-theme.
- Validate each screen with screenshots before claiming close visual match.
- Move to Visual Freeze Mode only after user approval or explicit freeze request.

## 4. Mockup Implementation Checklist

Check these before closing a visual task:

- Background: correct surface color, gradients, scrims and safe-area treatment.
- Cards: radius, elevation, border, opacity and internal padding match the
  reference.
- Typography: size, weight, line height, hierarchy and density match the
  surface.
- Spacing: gutters, vertical rhythm, section gaps and touch spacing are
  consistent.
- Buttons: primary, secondary, disabled and pressed states are token-driven.
- Icons/logos: registered assets only; no fake logos or emoji structural icons.
- Bottom nav: item count, selected state, labels, safe-area padding and height.
- Stepper: active/completed states, alignment and density.
- Density: mobile-first; no stretched desktop/tablet assumptions on phone.
- Old theme residue check: no obsolete palette, card style, shadow, nav,
  typography or placeholder visual language remains on rebuilt surfaces.
