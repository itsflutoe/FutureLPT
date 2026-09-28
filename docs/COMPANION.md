# FLPT Companion (feature branch)

This branch is reserved for the AI Companion Easter-egg integration.

## Status

Scaffold only. Full Companion implementation lands on this branch.

## Feature flag

```bash
VITE_COMPANION_ENABLED=true
```

When disabled (default), FutureLPT behaves exactly like production without Companion UI.

## Product hierarchy

FutureLPT (reviewer) → Practice / Progress → Companion (Easter egg) → Pet personality → AI helper

See integration spec discussed with product owner. Do not merge to `main` until Companion is complete and tested.
