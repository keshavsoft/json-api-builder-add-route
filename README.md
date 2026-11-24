# json-api-builder-add-route

> Localized Route Subtree Generator & AST Router Hooker for JSON API Builder.

`json-api-builder-add-route` lets you add new API versions (e.g. `v2`) or resource subtrees to an existing project **without touching or risking `app.js` or older versions (like `v1`)**.

---

## Features

- **AST-Driven:** Uses ESTree AST JSON templates and `astring` for clean, syntax-guaranteed code generation.
- **Localized Execution:** Run directly inside your router folder (e.g., `api/`).
- **Non-Destructive & Safe:** Only generates the new subtree (e.g. `v2/`) and injects the route mount into the immediate parent router (`routes.js`). Older routes and `app.js` remain completely untouched.
- **Idempotent:** Running multiple times will never duplicate imports or route mounts.

---

## Quick Start via `npx`

1. Navigate to your router directory:
   ```bash
   cd api
   ```

2. Create a scoped specification file (`v2.json`):
   ```json
   {
     "name": "v2",
     "routes": {
       "appointments": {
         "resource": "appointments",
         "idField": "id",
         "dataFile": "../../data/appointments.json"
       }
     }
   }
   ```

3. Run with `npx`:
   ```bash
   npx json-api-builder-add-route v2.json
   ```

---

## Result

- Generates `v2/routes.js`
- Generates `v2/appointments/routes.js` with full CRUD handlers (GET, POST, GET/:id, PUT/:id, DELETE/:id)
- Initializes `data/appointments.json`
- Safely injects the following into `api/routes.js`:
  ```javascript
  import v2Routes from "./v2/routes.js";
  routes.route("/v2", v2Routes);
  ```

---

## Programmatic Usage

```javascript
import { addRoute } from "json-api-builder-add-route";

addRoute({
  targetDir: process.cwd(),
  specFile: "v2.json"
});
```

---

## License

MIT © KeshavSoft
