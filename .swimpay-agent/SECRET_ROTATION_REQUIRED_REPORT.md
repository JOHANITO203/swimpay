# Secret Rotation Required Report

Date: 2026-05-13

## Scope

Manual staging rehearsals included command lines and responses that referenced sensitive auth material.

## Rotation matrix (values redacted)

1. Merchant SDK secret key (`sk_*`)
   - rotate_required: **yes**
   - owner: SwimPay merchant integration
   - reason: exposed during manual CLI/testing context
   - status: pending

2. Merchant webhook secret (`whsec_*`)
   - rotate_required: **yes**
   - owner: SwimPay merchant integration + external backend verifier
   - reason: referenced in operator testing context; safe to rotate proactively
   - status: pending

3. Android mobile merchant bearer (`spm_*`)
   - rotate_required: **yes**
   - owner: Android merchant session auth
   - reason: used in manual commands/log context
   - status: pending (invalidate old mobile sessions if possible)

4. External backend env webhook verifier secret
   - rotate_required: **yes**
   - owner: external app backend
   - reason: must stay in sync after webhook secret rotation
   - status: pending

5. DB runtime credentials (`POSTGRES_*`)
   - rotate_required: **optional/recommended**
   - owner: VPS runtime operator
   - reason: not directly leaked in captured outputs, but prudent after extensive shell sharing
   - status: optional

## Rotation checklist

1. Rotate merchant SDK secret in integration settings.
2. Rotate merchant webhook secret.
3. Update external backend env with new webhook secret.
4. Redeploy external backend.
5. Invalidate previous `spm_*` mobile sessions.
6. Re-run signed webhook rehearsal with new secrets.
7. Confirm old secrets no longer authorize requests.

## Guardrail

- Never paste raw secrets in chat/reports/screenshots.
- Keep reports masked-only.

