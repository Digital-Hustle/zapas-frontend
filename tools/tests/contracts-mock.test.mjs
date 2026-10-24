import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { EventEmitter } from "node:events";
import { createMockDocument, parseMockOptions, supervise } from "../lib/contracts-mock.mjs";

function contract(key, prefix) {
  return {
    key,
    prefix,
    document: {
      openapi: "3.1.0",
      info: { title: key, version: "1" },
      security: [{ session: [] }],
      paths: {
        "/me": {
          get: {
            operationId: "getMe",
            responses: {
              "200": { description: "Profile", content: { "application/json": { schema: { $ref: "#/components/schemas/Profile" } } } },
            },
          },
        },
      },
      components: {
        securitySchemes: { session: { type: "apiKey", in: "cookie", name: "session" } },
        schemas: {
          Profile: {
            type: "object",
            properties: { id: { $ref: "#/components/schemas/Id" } },
            discriminator: { propertyName: "type", mapping: { profile: "#/components/schemas/Profile" } },
          },
          Id: { type: "string" },
        },
      },
    },
  };
}

test("the mock exposes each service at its external API prefix without component collisions", () => {
  const input = [contract("auth", "/api/v1/auth"), contract("orchestrator", "/api/v1/orchestrator")];
  const original = structuredClone(input);
  const result = createMockDocument(input);
  assert.deepEqual(input, original, "bundling must not change the pinned contracts");
  const auth = result.paths["/api/v1/auth/me"].get;
  const business = result.paths["/api/v1/orchestrator/me"].get;
  assert.equal(auth.operationId, "auth_getMe");
  assert.equal(business.operationId, "orchestrator_getMe");
  assert.deepEqual(auth.security, [], "mock defaults to anonymous access so UI can render");
  assert.deepEqual(business.security, [], "mock defaults to anonymous access so UI can render");
  assert.equal(auth.responses["200"].content["application/json"].schema.$ref, "#/components/schemas/auth_Profile");
  assert.equal(result.components.schemas.auth_Profile.properties.id.$ref, "#/components/schemas/auth_Id");
  assert.equal(result.components.schemas.auth_Profile.discriminator.mapping.profile, "#/components/schemas/auth_Profile");
  assert.deepEqual(result.servers, [{ url: "/" }]);
});

test("Auth/Profile paths keep their existing full prefix and anonymous security", () => {
  const input = contract("auth_profile", "");
  input.document.paths = { "/api/v1/auth-profile/auth/csrf": { get: { operationId: "getCsrfToken", security: [], responses: {} } } };
  const result = createMockDocument([input]);
  assert.deepEqual(Object.keys(result.paths), ["/api/v1/auth-profile/auth/csrf"]);
  assert.deepEqual(result.paths["/api/v1/auth-profile/auth/csrf"].get.security, []);
});

test("strict mode preserves and namespaces security schemes without relaxing auth", () => {
  const result = createMockDocument([contract("orchestrator", "/api/v1/orchestrator")], { relaxSecurity: false });
  assert.deepEqual(result.paths["/api/v1/orchestrator/me"].get.security, [{ orchestrator_session: [] }]);
  assert.ok(result.components.securitySchemes.orchestrator_session);
});

test("internal paths and operations tagged internal never reach the public mock", () => {
  const input = contract("auth", "/api/v1/auth");
  input.document.paths["/internal/v1/users"] = { get: { operationId: "internalUsers", responses: {} } };
  input.document.paths["/me"].post = { tags: ["internal"], operationId: "internalCreate", responses: {} };
  const result = createMockDocument([input]);
  assert.deepEqual(Object.keys(result.paths), ["/api/v1/auth/me"]);
  assert.equal(result.paths["/api/v1/auth/me"].post, undefined);
});

test("method collisions and unbundled references fail rather than silently changing a contract", () => {
  assert.throws(() => createMockDocument([contract("one", "/api"), contract("two", "/api")]), /collision/i);
  const input = contract("auth", "/api");
  input.document.components.schemas.Id = { $ref: "other.yaml#/components/schemas/Id" };
  assert.throws(() => createMockDocument([input]), /bundled|external/i);
});

test("mock options validate the port, reject unknown arguments and never expose a host option", () => {
  assert.deepEqual(parseMockOptions([], {}), { port: 4010, withWeb: false, help: false });
  assert.equal(parseMockOptions(["--port", "4210", "--with-web"], {}).port, 4210);
  assert.equal(parseMockOptions([], { PRISM_PORT: "4310" }).port, 4310);
  for (const port of ["0", "65536", "1.5", "oops", "4010;echo", ""]) {
    assert.throws(() => parseMockOptions(["--port", port], {}), /port/i);
  }
  assert.throws(() => parseMockOptions(["--host", "0.0.0.0"], {}), /argument/i);
});

test("a failed child stops its sibling and preserves its exit code", async () => {
  const signals = new EventEmitter();
  const result = supervise([
    { command: process.execPath, args: ["-e", "setTimeout(() => process.exit(7), 150)"] },
    { command: process.execPath, args: ["-e", "setInterval(() => {}, 1000)"] },
  ], { signals, stdio: "pipe" });
  assert.equal(await result.completion, 7);
  assert.ok(result.children.every((child) => child.exitCode !== null || child.signalCode !== null));
  assert.equal(signals.listenerCount("SIGINT"), 0);
  assert.equal(signals.listenerCount("SIGTERM"), 0);
});

test("SIGINT waits for a real child to stop and cleans up signal handlers", async () => {
  const signals = new EventEmitter();
  const result = supervise([{ command: process.execPath, args: ["-e", "console.log('ready'); setInterval(() => {}, 1000)"] }], { signals, stdio: "pipe" });
  await once(result.children[0].stdout, "data");
  signals.emit("SIGINT");
  assert.equal(await result.completion, 130);
  assert.equal(signals.listenerCount("SIGINT"), 0);
});

test("a missing executable is a failed launch, not an uncaught error or a hanging sibling", async () => {
  const result = supervise([
    { command: "/not-a-zapas-executable", args: [] },
    { command: process.execPath, args: ["-e", "setInterval(() => {}, 1000)"] },
  ], { signals: new EventEmitter(), stdio: "pipe", onError: () => {} });
  assert.equal(await result.completion, 1);
});
