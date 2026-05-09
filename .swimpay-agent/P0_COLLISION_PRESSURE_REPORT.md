# P0 Collision Pressure Report

generated_at: 2026-05-09T23:10:00+03:00

Status: implemented in matching-core, persisted for new reviews.

Definition:

`collision_pressure = max(0, compatible_intents - 1)`

Added:

- `calculateCollisionPressure`.
- Payment Intent Gate vectors include collision pressure.
- Signal match vectors include collision pressure.
- `signal_matches.collision_pressure` migration column.

Tests cover:

- 0 compatible intents => 0;
- 1 compatible intent => 0;
- 2 compatible intents => 1;
- 10 compatible intents => 9.
