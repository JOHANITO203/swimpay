import { spawn } from 'node:child_process';
import { access, copyFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync, readdirSync, type Dirent } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

export interface ApktoolCheckResult {
  available: boolean;
  version?: string;
  error?: string;
}

export interface DecodeApkResult {
  apkPath: string;
  outputDir: string;
  apktoolVersion: string;
  stdout: string;
  stderr: string;
}

export async function ensureApktoolInstalled(): Promise<ApktoolCheckResult> {
  try {
    const result = await runApktool(['--version'], 60_000);
    return {
      available: true,
      version: result.stdout.trim() || result.stderr.trim() || 'unknown'
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'apktool check failed'
    };
  }
}

export async function decodeApk(input: {
  apkPath: string;
  outputDir: string;
  timeoutMs?: number | undefined;
}): Promise<DecodeApkResult> {
  await access(input.apkPath);
  const apktool = await ensureApktoolInstalled();
  if (!apktool.available) {
    throw new Error(`apktool is not available: ${apktool.error ?? 'unknown error'}`);
  }

  const prepared = await prepareApktoolInput(input.apkPath);
  try {
    const result = await runApktool(['d', prepared.apkPath, '-o', input.outputDir, '-f'], input.timeoutMs ?? 120_000);
    return {
      apkPath: input.apkPath,
      outputDir: input.outputDir,
      apktoolVersion: apktool.version ?? 'unknown',
      stdout: result.stdout,
      stderr: result.stderr
    };
  } finally {
    if (prepared.temporaryDir) {
      await rm(prepared.temporaryDir, { recursive: true, force: true });
    }
  }
}

async function runCommand(command: string, args: readonly string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} exited with ${code ?? 'unknown'}: ${stderr || stdout}`));
    });
  });
}

async function runApktool(args: readonly string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  const invocation = resolveApktoolInvocation(args);
  return runCommand(invocation.command, invocation.args, timeoutMs);
}

function resolveApktoolInvocation(args: readonly string[]): { command: string; args: string[] } {
  if (process.platform !== 'win32') {
    return { command: 'apktool', args: [...args] };
  }

  const jarPath = findWindowsApktoolJar();
  if (!jarPath) {
    return { command: 'apktool', args: [...args] };
  }

  return {
    command: 'java',
    args: [
      '-Xmx1024M',
      '-Duser.language=en',
      '-Dfile.encoding=UTF8',
      '-Djdk.util.zip.disableZip64ExtraFieldValidation=true',
      '-Djdk.nio.zipfs.allowDotZipEntry=true',
      '-jar',
      jarPath,
      ...args
    ]
  };
}

function findWindowsApktoolJar(): string | null {
  const pathDirs = (process.env.Path ?? process.env.PATH ?? '').split(delimiter).filter(Boolean);
  for (const dir of pathDirs) {
    const batPath = join(dir, 'apktool.bat');
    if (!existsSync(batPath)) {
      continue;
    }

    const jar = selectHighestApktoolJar(dirname(batPath));
    if (jar) {
      return jar;
    }
  }

  return null;
}

function selectHighestApktoolJar(directory: string): string | null {
  const entries = safeReadDir(directory);
  const jars = entries
    .filter((entry) => entry.isFile() && /^apktool(?:[_-]\d+(?:\.\d+){0,2})?\.jar$/i.test(entry.name))
    .map((entry) => join(directory, entry.name))
    .sort((a, b) => b.localeCompare(a));
  return jars[0] ?? null;
}

function safeReadDir(directory: string): Dirent[] {
  try {
    return readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function prepareApktoolInput(apkPath: string): Promise<{ apkPath: string; temporaryDir?: string | undefined }> {
  if (process.platform !== 'win32' || isAscii(apkPath)) {
    return { apkPath };
  }

  const temporaryDir = await mkdtemp(join(tmpdir(), 'swimpay-apktool-'));
  const asciiApkPath = join(temporaryDir, 'input.apk');
  await copyFile(apkPath, asciiApkPath);
  return { apkPath: asciiApkPath, temporaryDir };
}

function isAscii(value: string): boolean {
  return [...value].every((character) => character.charCodeAt(0) <= 127);
}
