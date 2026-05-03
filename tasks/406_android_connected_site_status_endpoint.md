# 406 - Android connected site status endpoint

Status: completed

Scope:
- Add `GET /v1/android-merchant/connected-site`.
- Require authenticated merchant context.
- Return safe webhook URL/status and latest delivery summaries.
- Hide webhook secrets by default.
- Show developer details only behind an explicit flag.
- Add tests.
