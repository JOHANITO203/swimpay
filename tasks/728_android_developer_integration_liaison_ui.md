# Task 728 - Android Developer Integration Liaison UI

Update Android `Integration developpeur` without redesigning the app.

UI requirements:
- rename/use primary test action as `Tester la liaison`;
- show concise statuses:
  - `Non testee`;
  - `Liaison verifiee`;
  - `Liaison non verifiee`;
  - `Action requise`;
- show `Webhook active` only after backend verified a 2xx external response;
- add retry behavior;
- keep copy/export compact;
- add revoke/rotate actions with icons and device-security gate for destructive secret actions.

Rules:
- do not expose raw secrets except show-once/copy flow;
- do not add verbose explanations;
- preserve current visual grammar;
- no Android direct webhook sending;
- no payment confirmation from Android.

Create:
`.swimpay-agent/ANDROID_DEVELOPER_LIAISON_UI_REPORT.md`
