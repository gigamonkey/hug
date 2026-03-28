import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Ensure package.json exists and clasp is installed locally.
 */
export function ensureClasp(): void {
  if (!existsSync("package.json")) {
    console.log("Initializing npm project...");
    execSync("npm init -y --quiet", { stdio: "ignore" });
  }
  if (
    !existsSync("node_modules/.bin/clasp") ||
    !existsSync("node_modules/.bin")
  ) {
    console.log("Installing clasp...");
    execSync("npm install --save-dev @google/clasp --quiet", {
      stdio: "ignore",
    });
  }
}

/**
 * Resolve the path to clasp, preferring local install.
 */
export function findClasp(): string {
  if (existsSync("./node_modules/.bin/clasp")) {
    return "./node_modules/.bin/clasp";
  }
  try {
    execFileSync("which", ["clasp"], { stdio: "ignore" });
    return "clasp";
  } catch {
    process.stderr.write(
      "Error: clasp not found. Run 'npm install @google/clasp' first.\n"
    );
    process.exit(1);
  }
}

const AUTH_ERROR_PATTERN =
  /authorize|unauthorized|unauthenticated|login|credential|ENOENT.*clasprc|401/i;

/**
 * Run clasp and check for auth errors on failure.
 * Returns stdout on success. On failure, prints stderr and exits.
 */
export function runClasp(clasp: string, args: string[]): string {
  try {
    const output = execFileSync(clasp, args, {
      encoding: "utf-8",
      stdio: ["inherit", "pipe", "pipe"],
    });
    return output;
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    const combined = (e.stdout || "") + (e.stderr || "");
    process.stderr.write(combined);

    if (AUTH_ERROR_PATTERN.test(combined)) {
      process.stderr.write(
        "\nHint: you may need to log in. Run 'npx clasp login' to authenticate.\n"
      );
    }

    process.exit(e.status || 1);
  }
}

/**
 * If the project is container-bound, patch parentId into .clasp.json.
 * Uses the Apps Script API to look up the project metadata.
 */
export function patchParentId(): void {
  if (!existsSync(".clasp.json")) return;

  const claspJson = JSON.parse(readFileSync(".clasp.json", "utf-8"));
  const scriptId = claspJson.scriptId;
  if (!scriptId) return;

  // Already has parentId
  if (claspJson.parentId) return;

  // Read access token from ~/.clasprc.json
  const clasprcPath = join(homedir(), ".clasprc.json");
  if (!existsSync(clasprcPath)) return;

  let token: string;
  try {
    const clasprc = JSON.parse(readFileSync(clasprcPath, "utf-8"));
    token = clasprc.token?.access_token || clasprc.access_token;
    if (!token) return;
  } catch {
    return;
  }

  // Fetch project metadata
  let parentId: string | undefined;
  try {
    const result = execFileSync("curl", [
      "-sf",
      "-H", `Authorization: Bearer ${token}`,
      `https://script.googleapis.com/v1/projects/${scriptId}`,
    ], { encoding: "utf-8" });
    const data = JSON.parse(result);
    parentId = data.parentId;
  } catch {
    return;
  }

  if (!parentId) return;

  claspJson.parentId = parentId;
  writeFileSync(".clasp.json", JSON.stringify(claspJson, null, 2) + "\n");
}
