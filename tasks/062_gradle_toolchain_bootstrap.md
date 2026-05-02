# 062 - Gradle Toolchain Bootstrap

## Goal

Bootstrap a Gradle command safely enough to generate the Android Receiver wrapper.

## Scope

- Inspect OS, shell, Java, Android SDK and Gradle availability.
- Inspect `winget`, `choco`, `scoop` availability.
- Prefer a non-destructive local Gradle distribution cache over global installation.
- Verify official Gradle distribution checksum before use.

## Acceptance Criteria

- Toolchain status is documented.
- No privileged/global install is performed.
- Any temporary Gradle distribution is outside the repo and verified by SHA256.

## Forbidden Work

- Do not manually invent a wrapper JAR.
- Do not install globally without a safe path.
- Do not modify product behavior.
