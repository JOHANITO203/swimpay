# 058 - Gradle Wrapper Generation Policy

## Goal

Define the safe policy for generating a Gradle wrapper for the Android Receiver.

## Scope

- Create `docs/GRADLE_WRAPPER_POLICY.md`.
- Explain trusted Gradle wrapper generation.
- Document why wrapper JARs must not be invented or copied blindly.
- Update blockers if Gradle is unavailable.

## Acceptance Criteria

- Policy names the allowed command: `gradle wrapper`.
- Policy requires a trusted local Gradle installation.
- Policy documents that current environment cannot generate the wrapper if Gradle is absent.

## Forbidden Work

- Do not paste, synthesize or fabricate `gradle-wrapper.jar`.
- Do not weaken existing static checks.
