# Task 698 - Metrics inventory

Status: completed

Goal: audit existing Android dashboard cards, review detail screen and backend data/API surfaces before wiring merchant metrics.

Scope:
- preserve Android premium dashboard visual structure;
- identify fake/demo values;
- identify reusable backend tables and existing endpoints;
- do not process real notifications;
- do not change payment confirmation semantics.

Findings to record:
- reusable existing UI;
- missing data;
- fake/demo values;
- backend endpoints needed.

Result:
- Reused the active premium Android dashboard and review-detail surfaces.
- Found fake dashboard values in the main card, shortcut cards and compact chart.
- Found no existing merchant metrics API contract; backend summary/timeseries endpoints were required.
- Review detail already had compatible rows and now consumes safe score/timeline fields.
