import { createInterface } from "node:readline";
import { runClasp } from "./clasp.js";

/**
 * Get all non-HEAD deployment lines.
 * If multiple, prompt the user to choose (or use the provided selector for testing).
 */
export async function selectDeployment(
  clasp: string,
  select?: (lines: string[]) => Promise<string>
): Promise<string> {
  const output = runClasp(clasp, ["list-deployments"]);
  const lines = output
    .split("\n")
    .filter((l) => l.startsWith("- ") && !l.includes("@HEAD"));

  if (lines.length === 0) {
    return "";
  }

  if (lines.length === 1) {
    return lines[0];
  }

  if (select) {
    return select(lines);
  }

  // Interactive selection
  process.stderr.write("Multiple deployments found. Choose one:\n");
  lines.forEach((line, i) => {
    process.stderr.write(`${i + 1}) ${line}\n`);
  });
  process.stderr.write("Choice: ");

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const choice = await new Promise<string>((resolve) => {
    rl.question("", (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= lines.length) {
    process.stderr.write("Error: invalid choice\n");
    process.exit(1);
  }

  return lines[idx];
}

/**
 * Extract deployment ID from a deployment line like "- AKfycbx... @3 - desc"
 */
export function deploymentId(line: string): string {
  const parts = line.split(/\s+/);
  return parts[1] || "";
}

/**
 * Extract description from a deployment line.
 * Format: "- <id> @<version> - <description>"
 */
export function deploymentDesc(line: string): string {
  const match = line.match(/^- \S+ @\S+ - (.*)$/);
  return match ? match[1] : "";
}

/**
 * Update a deployment to a specific version, preserving its description if it has one.
 */
export function updateDeployment(
  clasp: string,
  id: string,
  version: string,
  desc: string
): void {
  const args = ["update-deployment", id, "-V", version];
  if (desc) {
    args.push("-d", desc);
  }
  runClasp(clasp, args);
}
