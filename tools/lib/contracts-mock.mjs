import { spawn } from "node:child_process";

const methods = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);

export function createMockDocument(contracts, { relaxSecurity = true } = {}) {
  const result = {
    openapi: "3.1.0",
    info: {
      title: "Запас — public contract mocks (not a backend)",
      version: "1",
      description: relaxSecurity
        ? "Локальный mock: security снят, чтобы UI мог получать примеры без auth. Реальные 401/403/CSRF проверяются только на backend."
        : "Локальный mock с сохранёнными security-схемами контрактов.",
    },
    servers: [{ url: "/" }],
    paths: {},
    components: {},
  };
  for (const { key, prefix, document } of contracts) {
    if (!/^[a-z][a-z0-9_]*$/.test(key)) throw new Error(`Invalid contract key: ${key}`);
    const componentRef = (ref) => {
      if (!ref.startsWith("#/components/")) throw new Error(`Reference must be bundled: ${ref}`);
      return ref.replace(/^(#\/components\/[^/]+\/)/, `$1${key}_`);
    };
    const rewrite = (value) => {
      if (Array.isArray(value)) return value.map(rewrite);
      if (!value || typeof value !== "object") return value;
      const output = {};
      for (const [name, item] of Object.entries(value)) {
        if (name === "$ref") output[name] = componentRef(item);
        else if (name === "security") {
          output[name] = item.map((requirement) =>
            Object.fromEntries(Object.entries(requirement).map(([scheme, scopes]) => [`${key}_${scheme}`, scopes])),
          );
        } else if (name === "operationId") output[name] = `${key}_${item}`;
        else if (name === "discriminator") {
          output[name] = structuredClone(item);
          if (item.mapping)
            output[name].mapping = Object.fromEntries(Object.entries(item.mapping).map(([tag, ref]) => [tag, componentRef(ref)]));
        } else output[name] = rewrite(item);
      }
      return output;
    };

    for (const [section, definitions] of Object.entries(document.components ?? {})) {
      const target = (result.components[section] ??= {});
      for (const [name, definition] of Object.entries(definitions)) {
        const component = `${key}_${name}`;
        if (Object.hasOwn(target, component)) throw new Error(`Component collision: ${component}`);
        target[component] = rewrite(definition);
      }
    }
    for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
      if (path.split("/").includes("internal")) continue;
      const publicPath = `${prefix}${path}`;
      const item = {};
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!methods.has(method)) continue;
        if (operation.tags?.includes("internal")) continue;
        const security = relaxSecurity ? [] : (operation.security ?? document.security ?? []);
        item[method] = rewrite({ ...operation, security });
      }
      if (!Object.keys(item).length) continue;
      if (Object.hasOwn(result.paths, publicPath)) throw new Error(`Path collision: ${publicPath}`);
      result.paths[publicPath] = item;
    }
  }
  return result;
}

export function parseMockOptions(args, env = process.env) {
  let port = env.PRISM_PORT ?? "4010";
  let withWeb = false;
  let help = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--with-web") withWeb = true;
    else if (args[i] === "--help") help = true;
    else if (args[i] === "--port") port = args[++i];
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  if (!/^\d+$/.test(port ?? "") || Number(port) < 1 || Number(port) > 65535) {
    throw new Error("Prism port must be an integer from 1 to 65535");
  }
  return { port: Number(port), withWeb, help };
}

export function supervise(commands, { signals = process, stdio = "inherit", onError = console.error, stopTimeout = 3000 } = {}) {
  const children = [];
  const closed = new Set();
  let stopping = false;
  let exitCode = 0;
  let timer;
  let resolveCompletion;
  const completion = new Promise((resolve) => {
    resolveCompletion = resolve;
  });
  const finish = () => {
    if (closed.size !== children.length) return;
    clearTimeout(timer);
    signals.off("SIGINT", interrupt);
    signals.off("SIGTERM", terminate);
    resolveCompletion(exitCode);
  };
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    exitCode = code;
    for (const child of children) if (!closed.has(child)) child.kill("SIGTERM");
    timer = setTimeout(() => {
      for (const child of children) if (!closed.has(child)) child.kill("SIGKILL");
    }, stopTimeout);
    timer.unref();
  };
  const interrupt = () => stop(130);
  const terminate = () => stop(143);
  signals.once("SIGINT", interrupt);
  signals.once("SIGTERM", terminate);
  for (const { command, args, ...options } of commands) {
    const child = spawn(command, args, { stdio, shell: false, ...options });
    children.push(child);
    child.once("error", (error) => {
      onError(error.message);
      stop(1);
    });
    child.once("close", (code) => {
      closed.add(child);
      stop(code ?? 1);
      finish();
    });
  }
  if (!children.length) finish();
  return { children, completion, stop };
}