# Receiver Signing Staging Proof

Status: implementation ready, external staging proof pending.

Local validation: passed.

Required next proof:

1. Install updated staging APK.
2. Register/heartbeat receiver against `https://staging.swimpay.pro`.
3. Confirm backend stored a PEM public key, not `spk_`.
4. Queue one synthetic redacted signal.
5. Upload it and confirm backend accepts only the asymmetric signature.

Real bank notification capture remains gated.
