import { existsSync, cpSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the hug package root directory (where templates/ lives).
 */
export function hugRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // src/templates.ts -> project root (up two levels from dist/templates.js)
  return dirname(dirname(thisFile));
}

/**
 * Copy a template into the target directory.
 * Returns false if the template doesn't exist.
 */
export function copyTemplate(templateName: string, targetDir: string): boolean {
  const templateDir = join(hugRoot(), "templates", templateName);
  if (!existsSync(templateDir)) {
    return false;
  }
  cpSync(templateDir, targetDir, { recursive: true });
  return true;
}
