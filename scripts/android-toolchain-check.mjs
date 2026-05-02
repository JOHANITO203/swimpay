#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'C:\\Users\\Lenovo\\AppData\\Local\\Android\\Sdk';
const gradle = spawnSync('gradle', ['--version'], { shell: true, encoding: 'utf8' });
const java = spawnSync('java', ['-version'], { shell: true, encoding: 'utf8' });

console.log('# Android Toolchain Check');
console.log(`Android SDK path: ${sdk}`);
console.log(`Android SDK exists: ${existsSync(sdk)}`);
console.log(`Java available: ${java.status === 0}`);
console.log(`Gradle available: ${gradle.status === 0}`);

if (gradle.status !== 0) {
  console.log('Gradle wrapper/build was not run: no gradle command is available and no wrapper jar is checked in.');
}
