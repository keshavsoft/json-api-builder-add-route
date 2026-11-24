import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";
import { generate } from "astring";

function getCrudRouteSource(dataRelativePath, idField = "id") {
    return `import { Hono } from "hono";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const routes = new Hono();
const dataPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ${JSON.stringify(dataRelativePath)});
const readRows = async () => JSON.parse(await readFile(dataPath, "utf8"));
const writeRows = async rows => writeFile(dataPath, JSON.stringify(rows, null, 2) + "\\n");

routes.get("/", async c => c.json(await readRows()));

routes.post("/", async c => {
  const row = await c.req.json();
  const rows = await readRows();
  if (row[${JSON.stringify(idField)}] == null) row[${JSON.stringify(idField)}] = Date.now();
  rows.push(row);
  await writeRows(rows);
  return c.json(row, 201);
});

routes.get("/:id", async c => {
  const row = (await readRows()).find(item => String(item[${JSON.stringify(idField)}]) === c.req.param("id"));
  return row ? c.json(row) : c.json({ error: "Not found" }, 404);
});

routes.put("/:id", async c => {
  const rows = await readRows();
  const index = rows.findIndex(item => String(item[${JSON.stringify(idField)}]) === c.req.param("id"));
  if (index < 0) return c.json({ error: "Not found" }, 404);
  rows[index] = { ...rows[index], ...await c.req.json(), [${JSON.stringify(idField)}]: rows[index][${JSON.stringify(idField)}] };
  await writeRows(rows);
  return c.json(rows[index]);
});

routes.delete("/:id", async c => {
  const rows = await readRows();
  const index = rows.findIndex(item => String(item[${JSON.stringify(idField)}]) === c.req.param("id"));
  if (index < 0) return c.json({ error: "Not found" }, 404);
  rows.splice(index, 1);
  await writeRows(rows);
  return c.json({ deleted: true });
});

export default routes;
`;
}

function getSubtreeRouterSource(resourceNames) {
    const imports = [
        'import { Hono } from "hono";',
        ...resourceNames.map(r => `import ${r}Routes from "./${r}/routes.js";`)
    ].join("\n");

    const mounts = resourceNames.map(r => `routes.route("/${r}", ${r}Routes);`).join("\n");

    return `${imports}

const routes = new Hono();

${mounts}

export default routes;
`;
}

export function generateSubtree(targetDir, spec) {
    const routeName = spec.name ?? "v2";
    const resources = spec.routes ?? spec.resources ?? {};
    const subtreeDir = path.join(targetDir, routeName);
    fs.mkdirSync(subtreeDir, { recursive: true });

    const resourceNames = [];
    const createdFiles = [];

    for (const [resKey, resVal] of Object.entries(resources)) {
        const resourceDir = path.join(subtreeDir, resKey);
        fs.mkdirSync(resourceDir, { recursive: true });

        const dataRelative = resVal.dataFile ?? `../../data/${resKey}.json`;
        const idField = resVal.idField ?? "id";

        // Generate AST and serialize via astring
        const rawSource = getCrudRouteSource(dataRelative, idField);
        const ast = acorn.parse(rawSource, { ecmaVersion: "latest", sourceType: "module" });
        const code = generate(ast);

        const resourceRoutesPath = path.join(resourceDir, "routes.js");
        fs.writeFileSync(resourceRoutesPath, code.trim() + "\n", "utf8");
        createdFiles.push(resourceRoutesPath);

        // Ensure data file exists
        const dataFullPath = path.resolve(resourceDir, dataRelative);
        if (!fs.existsSync(dataFullPath)) {
            fs.mkdirSync(path.dirname(dataFullPath), { recursive: true });
            fs.writeFileSync(dataFullPath, "[]\n", "utf8");
            createdFiles.push(dataFullPath);
        }

        resourceNames.push(resKey);
    }

    // Generate subtree routes.js via AST and serialize via astring
    const rawRouterSource = getSubtreeRouterSource(resourceNames);
    const routerAst = acorn.parse(rawRouterSource, { ecmaVersion: "latest", sourceType: "module" });
    const routerCode = generate(routerAst);

    const subtreeRoutesPath = path.join(subtreeDir, "routes.js");
    fs.writeFileSync(subtreeRoutesPath, routerCode.trim() + "\n", "utf8");
    createdFiles.push(subtreeRoutesPath);

    return {
        routeName,
        subtreeDir,
        createdFiles
    };
}
