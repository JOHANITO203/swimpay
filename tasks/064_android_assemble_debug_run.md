# 064 - Android Assemble Debug Run

## Goal

Run the real Android debug build.

## Scope

- Run `:app:assembleDebug` from `apps/android-receiver/android`.
- Set `ANDROID_HOME`/`ANDROID_SDK_ROOT` for the local shell if needed.
- Fix Android configuration/code build issues within receiver scope only.

## Acceptance Criteria

- `assembleDebug` result is recorded.
- Build failures are triaged.
- No unsafe permissions or payment decision behavior are added.

## Forbidden Work

- Do not claim build PASS unless the command exits successfully.
- Do not add SMS, scraping or confirmation behavior.
