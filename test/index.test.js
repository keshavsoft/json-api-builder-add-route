import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { addRoute } from "../src/index.js";

test("addRoute exports the function API", () => {
    assert.equal(typeof addRoute, "function");
});

test("addRoute creates subtree and hooks into existing parent routes.js without touching v1", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "add-route-test-"));
    const apiDir = path.join(tmpDir, "api");
    const v1Dir = path.join(apiDir, "v1");
    fs.mkdirSync(v1Dir, { recursive: true });

    // Existing v1 files
    const existingV1RoutePath = path.join(v1Dir, "routes.js");
    const existingV1Code = `import { Hono } from "hono";\nconst routes = new Hono();\nroutes.get("/", c => c.json({ v: 1 }));\nexport default routes;\n`;
    fs.writeFileSync(existingV1RoutePath, existingV1Code, "utf8");

    // Existing api/routes.js with v1 already hooked
    const existingApiRoutesPath = path.join(apiDir, "routes.js");
    const existingApiRoutesCode = `import { Hono } from "hono";\nimport v1Routes from "./v1/routes.js";\nconst routes = new Hono();\nroutes.route("/v1", v1Routes);\nexport default routes;\n`;
    fs.writeFileSync(existingApiRoutesPath, existingApiRoutesCode, "utf8");

    // Scoped v2.json
    const spec = {
        name: "v2",
        routes: {
            appointments: {
                resource: "appointments",
                idField: "id",
                dataFile: "../../data/appointments.json"
            }
        }
    };

    const result = addRoute({
        targetDir: apiDir,
        spec
    });

    assert.equal(result.routeName, "v2");
    assert.ok(fs.existsSync(path.join(apiDir, "v2/routes.js")));
    assert.ok(fs.existsSync(path.join(apiDir, "v2/appointments/routes.js")));

    // 1. Verify v1 was completely untouched
    const v1CodeAfter = fs.readFileSync(existingV1RoutePath, "utf8");
    assert.equal(v1CodeAfter, existingV1Code, "v1 files must remain 100% untouched!");

    // 2. Verify api/routes.js now has both v1 and v2 hooked
    const apiRoutesAfter = fs.readFileSync(existingApiRoutesPath, "utf8");
    assert.ok(apiRoutesAfter.includes('import v1Routes from "./v1/routes.js"'));
    assert.ok(apiRoutesAfter.includes('import v2Routes from "./v2/routes.js"'));
    assert.ok(apiRoutesAfter.includes('routes.route("/v1", v1Routes)'));
    assert.ok(apiRoutesAfter.includes('routes.route("/v2", v2Routes)'));

    // 3. Verify idempotency: running again should not duplicate
    const secondRun = addRoute({ targetDir: apiDir, spec });
    assert.equal(secondRun.hookResult.alreadyHooked, true);

    const apiRoutesAfterSecond = fs.readFileSync(existingApiRoutesPath, "utf8");
    const v2MountMatches = apiRoutesAfterSecond.match(/routes\.route\("\/v2", v2Routes\)/g);
    assert.equal(v2MountMatches.length, 1, "Route must only be mounted once!");
});
