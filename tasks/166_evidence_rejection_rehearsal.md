# 166 - Evidence Rejection Rehearsal

Status: completed

Goal: rehearse operator rejection for a second synthetic evidence item.

Requirements:

- Submit a second synthetic evidence item or fixture.
- Reject through admin endpoint.
- Store a safe rejection reason.
- Verify final status `rejected`.
- Verify `bank_evidence.rejected` audit event.
- Confirm rejected evidence cannot become trusted and cannot enable auto-confirm.

Out of scope:

- Real bank package/cert evidence.
- Production trust transition.
