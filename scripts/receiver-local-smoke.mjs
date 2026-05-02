#!/usr/bin/env node

const backendBaseUrl = (process.env.RECEIVER_BACKEND_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/u, '');

const steps = [
  ['register_receiver_device', 'POST', '/v1/receiver-devices/register'],
  ['send_signed_heartbeat', 'POST', '/v1/receiver-devices/heartbeat'],
  ['upload_synthetic_redacted_signal', 'POST', '/v1/receiver/signals'],
  ['verify_backend_decision_pending', 'ASSERT', '/v1/receiver/signals'],
  ['verify_to_verify_routes_to_review', 'ASSERT', '/v1/reviews']
];

console.log(`# SwimPay Receiver Local Smoke Plan\n`);
console.log(`Backend: ${backendBaseUrl}`);
console.log(`Requires real Android device: false\n`);

for (const [name, method, path] of steps) {
  console.log(`- ${name}: ${method} ${backendBaseUrl}${path}`);
}

console.log('\nUse synthetic redacted payloads only. Accepted upload means backend_decision_pending, not payment confirmation.');
