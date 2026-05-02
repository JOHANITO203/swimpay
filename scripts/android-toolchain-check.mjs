#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const androidModulePath = resolve(repoRoot, 'apps/android-receiver/android');
const wrapperJarPath = join(androidModulePath, 'gradle/wrapper/gradle-wrapper.jar');
const gradlewPath = process.platform === 'win32' ? join(androidModulePath, 'gradlew.bat') : join(androidModulePath, 'gradlew');
const defaultSdkPath = process.platform === 'win32'
  ? 'C:\\Users\\Lenovo\\AppData\\Local\\Android\\Sdk'
  : `${process.env.HOME ?? ''}/Android/Sdk`;
const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || defaultSdkPath;

function run(command, args) {
  return spawnSync(command, args, { shell: true, encoding: 'utf8' });
}

function firstLine(output) {
  return output.split(/\r?\n/u).find((line) => line.trim().length > 0)?.trim() ?? 'unavailable';
}

const java = run('java', ['-version']);
const gradle = run('gradle', ['--version']);
const androidSdkAvailable = existsSync(sdkPath);
const androidModuleAvailable = existsSync(join(androidModulePath, 'settings.gradle.kts'))
  && existsSync(join(androidModulePath, 'app/build.gradle.kts'));
const gradleAvailable = gradle.status === 0;
const gradleWrapperAvailable = existsSync(wrapperJarPath) && existsSync(gradlewPath);
const assembleReady = androidSdkAvailable && androidModuleAvailable && (gradleAvailable || gradleWrapperAvailable);
const assembleCommand = gradleWrapperAvailable
  ? `${process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew'} :app:assembleDebug`
  : 'gradle :app:assembleDebug';

console.log('# Android Toolchain Check');
console.log(`Java available: ${java.status === 0}`);
console.log(`Java version: ${firstLine(java.stderr || java.stdout)}`);
console.log(`Android SDK path: ${sdkPath}`);
console.log(`Android SDK available: ${androidSdkAvailable}`);
console.log(`Gradle available: ${gradleAvailable}`);
console.log(`Gradle wrapper available: ${gradleWrapperAvailable}`);
console.log(`Gradle wrapper JAR path: ${wrapperJarPath}`);
console.log(`Android module path: ${androidModulePath}`);
console.log(`Android module available: ${androidModuleAvailable}`);
console.log(`assembleDebug command readiness: ${assembleReady ? 'ready' : 'blocked'}`);
console.log(`assembleDebug command: ${assembleCommand}`);

if (!gradleAvailable && !gradleWrapperAvailable) {
  console.log('Android build is blocked: no trusted gradle command is available and no Gradle wrapper JAR is checked in.');
  console.log('Do not manually invent or paste a gradle-wrapper.jar. Generate it with a trusted local Gradle installation.');
}
