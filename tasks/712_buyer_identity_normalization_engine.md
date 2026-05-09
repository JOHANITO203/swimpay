# Task 712 - Buyer identity normalization engine

Status: completed

Goal: implement deterministic buyer identity normalization for Latin/Cyrillic names.

Outputs:
- normalized full name;
- script detected;
- Latin/Cyrillic variants;
- initials variants;
- reversed-order variants;
- normalized tokens;
- buyer name fingerprint.

Output report:
- `.swimpay-agent/BUYER_IDENTITY_NORMALIZATION_REPORT.md`

Rules:
- no LLM;
- no external API;
- no network translation;
- deterministic transliteration only.
