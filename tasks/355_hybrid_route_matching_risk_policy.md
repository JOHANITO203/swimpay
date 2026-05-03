# Task 355 - Hybrid Route Matching Risk Policy

Status: completed in Sprint 7B.

Scope:
- Add route risk reason codes.
- Keep card transfers review-first by default.
- Treat phone sender hints as scoring/review metadata only.

Safety:
- Amount-only never auto-confirms.
- Missing route or review-only route forces review.
- Route risk affects review reasons and shadow prediction only.
