import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  makeTmpDir,
  runHug,
  readClaspLog,
  writeFile,
  readFile,
  initGit,
  findProjectRoot,
} from "./helpers.js";

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const thisDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = findProjectRoot(thisDir);
const mockClaspPath = resolve(projectRoot, "test", "mock-clasp-dir", "clasp");

// ─── version / help ──────────────────────────────────────────────────────────

describe("hug --version", () => {
  it("prints version", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["--version"]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout, /\d+\.\d+\.\d+/);
  });
});

describe("hug --help", () => {
  it("prints usage", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["--help"]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout, /Usage: hug/);
  });
});

describe("hug (no command)", () => {
  it("prints usage and exits 1", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, []);
    assert.equal(r.exitCode, 1);
    const output = r.stdout + r.stderr;
    assert.match(output, /Usage: hug/);
  });
});

describe("unknown command", () => {
  it("exits 1 with error", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["bogus"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /unknown command 'bogus'|unknown command bogus/);
  });
});

// ─── init ────────────────────────────────────────────────────────────────────

describe("hug init", () => {
  it("creates directory when name given", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["init", "myproject"]);
    assert.equal(r.exitCode, 0);
    assert.ok(existsSync(join(dir, "myproject", ".clasp.json")));
  });

  it("refuses if directory exists (no -f)", () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, "myproject"), { recursive: true });
    const r = runHug(dir, ["init", "myproject"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /already exists/);
  });

  it("accepts -f to override existing directory", () => {
    const dir = makeTmpDir();
    mkdirSync(join(dir, "myproject"), { recursive: true });
    const r = runHug(dir, ["init", "-f", "myproject"]);
    assert.equal(r.exitCode, 0);
  });

  it("copies blank template by default", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["init", "myproject"]);
    assert.equal(r.exitCode, 0);
    assert.ok(existsSync(join(dir, "myproject", "Code.js")));
    assert.ok(existsSync(join(dir, "myproject", "appsscript.json")));
  });

  it("copies webapp template with --template webapp", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["init", "--template", "webapp", "myproject"]);
    assert.equal(r.exitCode, 0);
    assert.ok(existsSync(join(dir, "myproject", "index.html")));
  });

  it("--scriptId runs clasp clone", () => {
    const dir = makeTmpDir();
    // Pre-create package.json and a fake node_modules/.bin/clasp
    // so ensureClasp() doesn't try to install the real clasp
    const projDir = join(dir, "myproject");
    mkdirSync(projDir, { recursive: true });
    writeFile(projDir, "package.json", '{"name":"test"}');
    mkdirSync(join(projDir, "node_modules", ".bin"), { recursive: true });
    symlinkSync(mockClaspPath, join(projDir, "node_modules", ".bin", "clasp"));
    const r = runHug(dir, ["init", "--scriptId", "abc123", "-f", "myproject"]);
    assert.equal(r.exitCode, 0, `stderr: ${r.stderr}, stdout: ${r.stdout}`);
    // MOCK_CLASP_LOG is set to dir/clasp.log (the cwd passed to runHug)
    const log = readClaspLog(dir);
    assert.ok(
      log.some((l) => l.includes("clone") && l.includes("abc123")),
      `clasp log: ${JSON.stringify(log)}`
    );
  });

  it("--scriptId and --template are mutually exclusive", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, [
      "init",
      "--scriptId",
      "abc123",
      "--template",
      "webapp",
    ]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /cannot be used with/);
  });

  it("errors on unknown template", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["init", "--template", "nonexistent", "myproject"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /unknown template/);
  });

  it("refuses if .clasp.json already exists (no name, no -f)", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".clasp.json", "{}");
    const r = runHug(dir, ["init"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /already exists/);
  });
});

// ─── fork ────────────────────────────────────────────────────────────────────

describe("hug fork", () => {
  it("refuses if no .clasp.json", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["fork"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /no .clasp.json/);
  });

  it("refuses if container-bound without --force or --detach", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".clasp.json",
      JSON.stringify({ scriptId: "s1", parentId: "p1" })
    );
    writeFile(dir, "appsscript.json", "{}");
    const r = runHug(dir, ["fork"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /container-bound/);
  });

  it("--force proceeds despite container-bound", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".clasp.json",
      JSON.stringify({ scriptId: "s1", parentId: "p1" })
    );
    writeFile(dir, "appsscript.json", "{}");
    const r = runHug(dir, ["fork", "--force"]);
    assert.equal(r.exitCode, 0);
    const log = readClaspLog(dir);
    assert.ok(log.some((l) => l.includes("create")));
    assert.ok(log.some((l) => l.includes("push")));
  });

  it("--detach sets CONTAINER_ID in config.js", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".clasp.json",
      JSON.stringify({ scriptId: "s1", parentId: "p1" })
    );
    writeFile(dir, "appsscript.json", "{}");
    const r = runHug(dir, ["fork", "--detach"]);
    assert.equal(r.exitCode, 0);
    const config = readFile(dir, "config.js");
    assert.ok(config);
    assert.match(config, /CONTAINER_ID/);
    assert.match(config, /p1/);
  });

  it("preserves appsscript.json after clasp create", () => {
    const dir = makeTmpDir();
    const originalManifest = '{"timeZone":"America/Los_Angeles","exceptionLogging":"STACKDRIVER"}';
    writeFile(dir, ".clasp.json", JSON.stringify({ scriptId: "s1" }));
    writeFile(dir, "appsscript.json", originalManifest);
    const r = runHug(dir, ["fork"]);
    assert.equal(r.exitCode, 0);
    const manifest = readFile(dir, "appsscript.json");
    assert.equal(manifest, originalManifest);
  });

  it("calls clasp push with --force", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".clasp.json", JSON.stringify({ scriptId: "s1" }));
    writeFile(dir, "appsscript.json", "{}");
    const r = runHug(dir, ["fork"]);
    assert.equal(r.exitCode, 0);
    const log = readClaspLog(dir);
    assert.ok(log.some((l) => l === "push --force"));
  });
});

// ─── deploy ──────────────────────────────────────────────────────────────────

describe("hug deploy", () => {
  let dir: string;

  beforeEach(() => {
    dir = makeTmpDir();
    writeFile(dir, ".clasp.json", JSON.stringify({ scriptId: "s1" }));
  });

  it("calls push, create-version, then update-deployment", () => {
    const r = runHug(dir, ["deploy", "my deploy"]);
    assert.equal(r.exitCode, 0);
    const log = readClaspLog(dir);
    assert.ok(log[0]?.startsWith("push"));
    assert.ok(log[1]?.startsWith("create-version"));
    // Third call is list-deployments (to find existing deployment)
    assert.ok(log[2]?.startsWith("list-deployments"));
    // Fourth call is update-deployment
    assert.ok(log[3]?.startsWith("update-deployment"));
  });

  it("parses version number from clasp create-version output", () => {
    const r = runHug(dir, ["deploy"]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout, /version 3/);
  });
});

// ─── config ──────────────────────────────────────────────────────────────────

describe("hug config", () => {
  it("lists nothing when no config.js", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["config"]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout, /No config.js/);
  });

  it("set creates config.js if missing", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["config", "set", "FOO=bar"]);
    assert.equal(r.exitCode, 0);
    const content = readFile(dir, "config.js");
    assert.ok(content);
    assert.match(content, /FOO/);
    assert.match(content, /bar/);
  });

  it("set updates existing key", () => {
    const dir = makeTmpDir();
    runHug(dir, ["config", "set", "FOO=bar"]);
    runHug(dir, ["config", "set", "FOO=baz"]);
    const r = runHug(dir, ["config"]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout, /FOO=baz/);
    assert.doesNotMatch(r.stdout, /FOO=bar/);
  });

  it("set adds new key, preserves others", () => {
    const dir = makeTmpDir();
    runHug(dir, ["config", "set", "FOO=bar"]);
    runHug(dir, ["config", "set", "BAZ=qux"]);
    const r = runHug(dir, ["config"]);
    assert.match(r.stdout, /FOO=bar/);
    assert.match(r.stdout, /BAZ=qux/);
  });

  it("set multiple keys in one command", () => {
    const dir = makeTmpDir();
    runHug(dir, ["config", "set", "A=1", "B=2"]);
    const r = runHug(dir, ["config"]);
    assert.match(r.stdout, /A=1/);
    assert.match(r.stdout, /B=2/);
  });

  it("unset removes a key", () => {
    const dir = makeTmpDir();
    runHug(dir, ["config", "set", "FOO=bar", "BAZ=qux"]);
    runHug(dir, ["config", "unset", "FOO"]);
    const r = runHug(dir, ["config"]);
    assert.doesNotMatch(r.stdout, /FOO/);
    assert.match(r.stdout, /BAZ=qux/);
  });

  it("unset all keys deletes config.js", () => {
    const dir = makeTmpDir();
    runHug(dir, ["config", "set", "FOO=bar"]);
    runHug(dir, ["config", "unset", "FOO"]);
    assert.ok(!existsSync(join(dir, "config.js")));
  });

  it("unset errors if config.js missing", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["config", "unset", "FOO"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /No config.js/);
  });

  it("invalid KEY=VALUE format errors", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["config", "set", "bad-format"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /invalid format/);
  });
});

// ─── pull ────────────────────────────────────────────────────────────────────

describe("hug pull", () => {
  it("refuses with uncommitted git changes", () => {
    const dir = makeTmpDir();
    writeFile(dir, "tracked.txt", "original");
    initGit(dir);
    // Modify a tracked file to create uncommitted changes
    writeFile(dir, "tracked.txt", "changed");
    const r = runHug(dir, ["pull"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /uncommitted changes/);
  });

  it("-f bypasses git check", () => {
    const dir = makeTmpDir();
    initGit(dir);
    writeFile(dir, "dirty.txt", "changed");
    const r = runHug(dir, ["pull", "-f"]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout, /Pulled/);
  });
});

// ─── push ────────────────────────────────────────────────────────────────────

describe("hug push", () => {
  it("passes args through to clasp", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["push"]);
    assert.equal(r.exitCode, 0);
    const log = readClaspLog(dir);
    assert.ok(log.some((l) => l === "push"));
  });
});

// ─── open ────────────────────────────────────────────────────────────────────

describe("hug open", () => {
  it("calls clasp open-script by default", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["open"]);
    assert.equal(r.exitCode, 0);
    const log = readClaspLog(dir);
    assert.ok(log.some((l) => l === "open-script"));
  });

  it("--container calls clasp open-container", () => {
    const dir = makeTmpDir();
    writeFile(
      dir,
      ".clasp.json",
      JSON.stringify({ scriptId: "s1", parentId: "p1" })
    );
    const r = runHug(dir, ["open", "--container"]);
    assert.equal(r.exitCode, 0);
    const log = readClaspLog(dir);
    assert.ok(log.some((l) => l === "open-container"));
  });

  it("--container errors if not container-bound", () => {
    const dir = makeTmpDir();
    writeFile(dir, ".clasp.json", JSON.stringify({ scriptId: "s1" }));
    const r = runHug(dir, ["open", "--container"]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /not container-bound/);
  });
});

// ─── versions / deployments ──────────────────────────────────────────────────

describe("hug versions", () => {
  it("lists versions", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["versions"]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout, /Version/);
  });
});

describe("hug deployments", () => {
  it("lists deployments", () => {
    const dir = makeTmpDir();
    const r = runHug(dir, ["deployments"]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout, /Deployments/);
  });
});
