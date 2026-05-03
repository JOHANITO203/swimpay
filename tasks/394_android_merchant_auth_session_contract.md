# 394 - Android merchant auth/session contract

Status: completed

Scope:
- Define a typed Android merchant auth/session boundary.
- Use local/dev merchant bearer auth only where explicitly marked.
- Keep API keys, webhook secrets and production secrets out of UI/log state.
- Add tests for disconnected auth, redacted UI/log state and local/dev labeling.
