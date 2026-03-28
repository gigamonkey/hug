import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const testDir = dirname(thisFile);

// When compiled via tsconfig.test.json, this file lives at dist-test/test/helpers.js.
// The project root is two levels up from the source test/ dir.
// We find it by looking for package.json.
export const findProjectRoot = (start: string): string => {
  let dir = start;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("Could not find project root");
}

const projectRoot = findProjectRoot(testDir);
const mockClasp = resolve(projectRoot, "test", "mock-clasp-dir", "clasp");
const hugCli = resolve(projectRoot, "dist", "cli.js");

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Create a temp directory and return its path.
 */
export const makeTmpDir = (): string => {
  return mkdtempSync(join(tmpdir(), "hug-test-"));
}

/**
 * Run the hug TS CLI in a given working directory with mock clasp.
 */
export const runHug = (
  cwd: string,
  args: string[],
  env?: Record<string, string>
): RunResult => {
  const logFile = join(cwd, "clasp.log");
  const mergedEnv: Record<string, string> = {
    ...process.env as Record<string, string>,
    HUG_CLASP: mockClasp,
    MOCK_CLASP_LOG: logFile,
    ...env,
  };

  try {
    const stdout = execFileSync("node", [hugCli, ...args], {
      cwd,
      encoding: "utf-8",
      env: mergedEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      exitCode: e.status ?? 1,
    };
  }
}

/**
 * Read the mock clasp invocation log.
 */
export const readClaspLog = (cwd: string): string[] => {
  const logFile = join(cwd, "clasp.log");
  if (!existsSync(logFile)) return [];
  return readFileSync(logFile, "utf-8").trim().split("\n").filter(Boolean);
}

/**
 * Write a file in the given directory.
 */
export const writeFile = (dir: string, name: string, content: string): void => {
  writeFileSync(join(dir, name), content);
}

/**
 * Read a file from the given directory, or return null if missing.
 */
export const readFile = (dir: string, name: string): string | null => {
  const p = join(dir, name);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf-8");
}

/**
 * Initialize a git repo in the directory (needed for `hug pull` checks).
 */
export const initGit = (dir: string): void => {
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init", "--allow-empty"], {
    cwd: dir,
    stdio: "ignore",
  });
}
