# 22 — Admin Console Specification

## Purpose

The Admin Console is for SwimPay operators, not merchants.

It helps monitor signal quality, templates, drift, fraud and webhooks.

## Pages

- Bank Profiles;
- Template Registry;
- Drift Radar;
- Signal Quality;
- Merchant Risk;
- Device Risk;
- Webhook Failures;
- Audit Search.

## Bank Profiles page

Show:

- bank profile id;
- display name;
- status;
- reliability index;
- unknown rate;
- drift rate;
- auto-confirm status.

Actions:

- set status;
- disable auto-confirm;
- mark review_only;
- view templates.

## Template Registry page

Show:

- template id;
- bank profile;
- direction;
- canonical title;
- canonical body;
- seen count;
- human verified count;
- false positives;
- reliability score;
- status.

Actions:

- promote;
- degrade;
- disable;
- merge;
- mark false positive.

## Drift Radar page

Show:

- new templates;
- unknown rate trend;
- parser confidence trend;
- phone visibility trend;
- reference visibility trend;
- amount extraction success trend.

## Fraud/Risk page

Show:

- duplicate notification attempts;
- suspicious manual confirmations;
- device anomalies;
- same-amount bursts;
- merchant risk spikes.

## Rules

Admin actions must create audit events.

Admin console must not expose raw sensitive data by default.
