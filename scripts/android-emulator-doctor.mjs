#!/usr/bin/env node

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const defaultSdkPath = process.platform === 'win32'
  ? 'C:\\Users\\Lenovo\\AppData\\Local\\Android\\Sdk'
  : `${process.env.HOME ?? ''}/Android/Sdk`;
const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultSdkPath;
const adbPath = process.platform === 'win32'
  ? join(sdkPath, 'platform-tools/adb.exe')
  : join(sdkPath, 'platform-tools/adb');
const emulatorPath = process.platform === 'win32'
  ? join(sdkPath, 'emulator/emulator.exe')
  : join(sdkPath, 'emulator/emulator');
const avdHome = process.env.ANDROID_AVD_HOME || join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.android/avd');
const appApkPath = resolve(repoRoot, 'apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk');

function run(command, args) {
  return spawnSync(command, args, { shell: false, encoding: 'utf8' });
}

function splitLines(output) {
  return output.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

function listAvds() {
  if (existsSync(emulatorPath)) {
    const result = run(emulatorPath, ['-list-avds']);
    if (result.status === 0) {
      return splitLines(result.stdout);
    }
  }

  if (!existsSync(avdHome)) {
    return [];
  }

  return readdirSync(avdHome)
    .filter((name) => name.endsWith('.avd'))
    .map((name) => name.replace(/\.avd$/u, ''));
}

function listDevices() {
  if (!existsSync(adbPath)) {
    return [];
  }
  const result = run(adbPath, ['devices', '-l']);
  if (result.status !== 0) {
    return [];
  }

  return splitLines(result.stdout)
    .filter((line) => !line.startsWith('List of devices'))
    .filter((line) => /\b(device|offline|unauthorized)\b/u.test(line));
}

const adbAvailable = existsSync(adbPath);
const emulatorAvailable = existsSync(emulatorPath);
const avds = listAvds();
const devices = listDevices();
const apkAvailable = existsSync(appApkPath);

console.log('# Android Emulator Doctor');
console.log(`Android SDK path: ${sdkPath}`);
console.log(`adb available: ${adbAvailable}`);
console.log(`adb path: ${adbPath}`);
console.log(`emulator command available: ${emulatorAvailable}`);
console.log(`emulator path: ${emulatorPath}`);
console.log(`available AVDs: ${avds.length > 0 ? avds.join(', ') : 'none'}`);
console.log(`running devices: ${devices.length > 0 ? devices.join(' | ') : 'none'}`);
console.log(`app APK path: ${appApkPath}`);
console.log(`app APK available: ${apkAvailable}`);
console.log('backend local URL guidance: emulator should use http://10.0.2.2:3000 or the local proxy URL documented in LOCAL_DEVELOPMENT.md');

if (!emulatorAvailable || avds.length === 0 || devices.length === 0) {
  console.log('emulator smoke status: blocked until the Android Emulator package, an AVD, and a running device are available.');
}
