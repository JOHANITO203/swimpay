# SwimPay Task Queue

The runner may prepare only one pending task at a time.

If a task file exists in `tasks/`, it can be prepared. If the root task file is missing, it is marked `missing` and is not automatic.

## Queue

- [x] `024_operator_auth_and_admin_rbac` - status: completed - source: `tasks/024_operator_auth_and_admin_rbac.md`
- [x] `025_nats_jetstream_consumers` - status: completed - source: `tasks/025_nats_jetstream_consumers.md`
- [x] `026_postgres_webhook_delivery_loop` - status: completed - source: `tasks/026_postgres_webhook_delivery_loop.md`
- [x] `027_signal_runtime_pipeline` - status: completed - source: `tasks/027_signal_runtime_pipeline.md`
- [x] `028_review_rejection_semantics` - status: completed - source: `tasks/028_review_rejection_semantics.md`
- [x] `029_durable_worker_e2e_tests` - status: completed - source: `tasks/029_durable_worker_e2e_tests.md`
- [ ] `030_runtime_observability` - status: pending - source: `tasks/030_runtime_observability.md`
- [ ] `031_android_receiver_contract_validation` - status: pending - source: `tasks/031_android_receiver_contract_validation.md`
