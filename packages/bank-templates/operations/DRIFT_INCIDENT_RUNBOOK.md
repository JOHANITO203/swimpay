# Drift Incident Runbook

## Drift levels

```text
minor_drift
major_drift
critical_drift
```

## Minor drift

Action:

```text
shadow test new templates
keep existing trusted templates
do not trust new variants automatically
```

## Major drift

Action:

```text
lower auto-confirm limits
set affected templates to review_only if needed
increase review sampling
notify operators
```

## Critical drift

Action:

```text
disable auto-confirm for affected bank
route signals to review
notify affected merchants
create admin incident
add fixtures
update templates
run adversarial tests
```

## Recovery

A bank can return to trusted state only after:

```text
unknown_rate normal
false_positive_count 0
fixtures pass
shadow agreement rate high
operator approval
```
