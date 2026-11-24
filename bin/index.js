#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { addRoute } from "../src/index.js";

const specArg = process.argv[2] ?? "v2.json";
const targetDir = process.cwd();
const specPath = path.resolve(targetDir, specArg);

console.log("=============================================================");
console.log("  JSON API Builder Add Route CLI                             ");
console.log("=============================================================");

if (!fs.existsSync(specPath)) {
    console.error(`\n❌ Error: Spec file not found: ${specPath}`);
    console.error(`Usage: npx json-api-builder-add-route [spec-file.json]\n`);
    process.exit(1);
}

try {
    console.log(`- Working Directory: ${targetDir}`);
    console.log(`- Route Spec File:   ${specPath}`);

    const result = addRoute({
        targetDir,
        specFile: specArg
    });

    console.log("\n[Result]");
    console.log(`✔ Subtree '${result.routeName}' created successfully!`);
    console.log(`- Subtree Directory: ${result.subtreeDir}`);
    console.log(`- Generated Files:   ${result.createdFiles.length}`);
    if (result.hookResult) {
        console.log(`- Hooked Router:     ${result.parentRouterPath} (updated: ${!result.hookResult.alreadyHooked})`);
    }
    console.log("=============================================================\n");
} catch (err) {
    console.error("\n❌ Add Route failed:", err.message);
    process.exit(1);
}
