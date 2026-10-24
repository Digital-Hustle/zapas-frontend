#!/usr/bin/env node
// Public contract mocks for local UI work. Not a backend: Prism serves schema examples only,
// there is no OTP delivery, persistence, authorization or CSV parsing.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createMockDocument, parseMockOptions, supervise } from "./lib/contracts-mock.mjs";
import { root } from "./lib/run.mjs";

const redocly = join(root, "node_modules/@redocly/cli/bin/cli.js");
const prism = join(root, "node_modules/@stoplight/prism-cli/dist/index.js");
const vite = join(root, "apps/web/node_modules/vite/bin/vite.js");
const contracts = [
  ["auth_profile", "auth-profile.yaml", ""],
  ["auth", "auth.yaml", "/api/v1/auth"],
  ["orchestrator", "orchestrator.openapi.yaml", "/api/v1/orchestrator"],
  ["preprocessor", "preprocessor-upload.openapi.yaml", "/api/v1/preprocessor"],
];

async function main() {
  const options = parseMockOptions(process.argv.slice(2));
  if (options.help) {
    console.log(
      "Usage: pnpm contracts:mock [--port 4010] [--with-web]\n" +
        "Loopback-only schema examples; no real OTP, persistence or access control.",
    );
    return 0;
  }
  const scratch = await mkdtemp(join(tmpdir(), "zapas-contract-mocks-"));
  try {
    const bundled = [];
    for (const [key, file, prefix] of contracts) {
      const output = join(scratch, `${key}.json`);
      const command = spawnSync(
        process.execPath,
        [redocly, "bundle", join(root, "contracts/openapi", file), "--output", output],
        { cwd: root, stdio: "inherit" },
      );
      if (command.error || command.status !== 0) {
        throw new Error(`Cannot bundle ${key}; run pnpm install --frozen-lockfile first`);
      }
      bundled.push({ key, prefix, document: JSON.parse(await readFile(output, "utf8")) });
    }
    const document = join(scratch, "public.json");
    await writeFile(document, JSON.stringify(createMockDocument(bundled)), { mode: 0o600 });
    console.log(`Contract mock: http://127.0.0.1:${options.port} — schema examples only, not backend integration.`);
    const commands = [
      {
        command: process.execPath,
        args: [prism, "mock", document, "--host", "127.0.0.1", "--port", String(options.port)],
        cwd: root,
      },
    ];
    if (options.withWeb) {
      commands.push({
        command: process.execPath,
        args: [vite, "--mode", "mock", "--host", "127.0.0.1", "--strictPort"],
        cwd: join(root, "apps/web"),
        env: { ...process.env, VITE_PREVIEW_MOCKS: "0", VITE_PROXY_TARGET: `http://127.0.0.1:${options.port}` },
      });
    }
    return await supervise(commands).completion;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}