# SwimPay Task Queue

The runner may prepare only one pending task at a time.

If a task file exists in `tasks/`, it can be prepared. If the root task file is missing, it is marked `missing` and is not automatic.

## Queue

- [x] `068_emulator_environment_doctor` - status: completed - source: `tasks/068_emulator_environment_doctor.md`
- [ ] `069_emulator_install_and_launch` - status: blocked - source: `tasks/069_emulator_install_and_launch.md`
- [x] `070_notification_access_manual_flow` - status: completed - source: `tasks/070_notification_access_manual_flow.md`
- [ ] `071_receiver_register_heartbeat_local_backend` - status: blocked - source: `tasks/071_receiver_register_heartbeat_local_backend.md`
- [ ] `072_receiver_synthetic_signal_upload_local_backend` - status: blocked - source: `tasks/072_receiver_synthetic_signal_upload_local_backend.md`
- [ ] `073_receiver_outbox_offline_online_smoke` - status: blocked - source: `tasks/073_receiver_outbox_offline_online_smoke.md`
- [x] `074_emulator_smoke_closeout_review` - status: completed - source: `tasks/074_emulator_smoke_closeout_review.md`
