# Receiver Signing Migration Compatibility

Compatibility result:

- No database migration required; `receiver_devices.public_key TEXT` stores PEM.
- Existing devices registered with legacy shared keys must re-register.
- Runtime config clears the old shared-key preference on save.
- Debug-only smoke may use HMAC locally, but non-debug listener/runtime cannot.

Operator impact:
- Reinstall or open the updated APK and re-run receiver registration before staging upload proof.
