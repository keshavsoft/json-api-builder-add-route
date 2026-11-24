import fs from "node:fs";
import path from "node:path";
import { generateSubtree } from "./generate-subtree.js";
import { hookParentRouter } from "./hook-parent-router.js";

export function addRoute(options = {}) {
    const targetDir = path.resolve(options.targetDir ?? process.cwd());
    let spec = options.spec;

    if (!spec) {
        const specFile = options.specFile ?? "v2.json";
        const specPath = path.resolve(targetDir, specFile);
        if (!fs.existsSync(specPath)) {
            throw new Error(`Route specification file not found: ${specPath}`);
        }
        spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
    }

    const parentRouterName = options.parentRouterName ?? "routes.js";
    const parentRouterPath = path.join(targetDir, parentRouterName);

    // 1. Generate new subtree
    const subtreeResult = generateSubtree(targetDir, spec);

    // 2. Hook into parent router if it exists
    let hookResult = null;
    if (fs.existsSync(parentRouterPath)) {
        hookResult = hookParentRouter(parentRouterPath, subtreeResult.routeName);
    }

    return {
        targetDir,
        routeName: subtreeResult.routeName,
        subtreeDir: subtreeResult.subtreeDir,
        createdFiles: subtreeResult.createdFiles,
        parentRouterPath: fs.existsSync(parentRouterPath) ? parentRouterPath : null,
        hookResult
    };
}

export default { addRoute };
