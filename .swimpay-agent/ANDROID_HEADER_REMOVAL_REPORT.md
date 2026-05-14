# Android Header Removal Report

Date: 2026-05-14

Removed from the active app shell:
- hamburger menu button;
- permanent top-left brand mark;
- repeated `SwimPay Merchant` global header;
- home-only top chrome block.

Preserved:
- screen-level titles;
- sub-screen back arrows;
- status bar visibility;
- bottom navigation.

Result:
- The main app now opens as content on a fullscreen premium surface instead of `[status bar] + [brand header] + [content]`.

