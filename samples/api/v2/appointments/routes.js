import {Hono} from "hono";
import {readFile, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
const routes = new Hono();
const dataPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/appointments.json");
const readRows = async () => JSON.parse(await readFile(dataPath, "utf8"));
const writeRows = async rows => writeFile(dataPath, JSON.stringify(rows, null, 2) + "\n");
routes.get("/", async c => c.json(await readRows()));
routes.post("/", async c => {
  const row = await c.req.json();
  const rows = await readRows();
  if (row["id"] == null) row["id"] = Date.now();
  rows.push(row);
  await writeRows(rows);
  return c.json(row, 201);
});
routes.get("/:id", async c => {
  const row = (await readRows()).find(item => String(item["id"]) === c.req.param("id"));
  return row ? c.json(row) : c.json({
    error: "Not found"
  }, 404);
});
routes.put("/:id", async c => {
  const rows = await readRows();
  const index = rows.findIndex(item => String(item["id"]) === c.req.param("id"));
  if (index < 0) return c.json({
    error: "Not found"
  }, 404);
  rows[index] = {
    ...rows[index],
    ...await c.req.json(),
    ["id"]: rows[index]["id"]
  };
  await writeRows(rows);
  return c.json(rows[index]);
});
routes.delete("/:id", async c => {
  const rows = await readRows();
  const index = rows.findIndex(item => String(item["id"]) === c.req.param("id"));
  if (index < 0) return c.json({
    error: "Not found"
  }, 404);
  rows.splice(index, 1);
  await writeRows(rows);
  return c.json({
    deleted: true
  });
});
export default routes;
