# Checkout UX Design Plan

Date: 2026-05-09

## Direction

Refactor the checkout into a calm, mobile-first, Apple-like guided flow.

Design principles:
- fewer words;
- stronger hierarchy;
- big primary actions;
- compact copyable payment details;
- smooth but lightweight motion;
- safe-area friendly mobile layout;
- no buyer-facing technical Intelligence internals.

## Flow

1. Intro
   - Pay with SwimPay.
   - Three short cards: guided payment, live status, merchant return.

2. Buyer information
   - Name.
   - Method card or phone/SBP copy.
   - Sender bank.
   - Method-specific sender input only.

3. Payment instructions
   - Exact amount.
   - Reference.
   - Receiver destination.
   - Bank/method.
   - Copy buttons.
   - Open bank.

4. Waiting status
   - Timeline.
   - Signal wording remains non-final.
   - Return/retry/contact actions by final state.

## Component Shape

Implemented inside the existing web renderer without adding a new dependency:
- checkout shell;
- step progress;
- intro cards;
- buyer form panel;
- method selector;
- copyable payment rows;
- countdown;
- waiting timeline;
- status notice.

## Inspiration

Used `ui-ux-pro-max` for mobile UX rules and 21st/Magic inspiration for compact checkout stepper/card patterns.
