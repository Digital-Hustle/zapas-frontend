#!/usr/bin/env node
// Токены генерируются детерминированно; CI проверяет отсутствие дрейфа.
import { run } from "./lib/run.mjs";
run("pnpm", ["--filter", "@zapas/tokens", "run", "gen", "--", "--check"]);