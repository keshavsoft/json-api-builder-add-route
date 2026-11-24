import fs from "node:fs";
import * as acorn from "acorn";
import { generate } from "astring";

export function hookParentRouter(parentRouterPath, routeName) {
    if (!fs.existsSync(parentRouterPath)) {
        throw new Error(`Parent router file not found: ${parentRouterPath}`);
    }

    const source = fs.readFileSync(parentRouterPath, "utf8");
    const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "module" });

    const importSource = `./${routeName}/routes.js`;
    const variableName = `${routeName}Routes`;
    const routeMountPath = `/${routeName}`;

    // 1. Check if import already exists
    let hasImport = false;
    let lastImportIndex = -1;

    for (let i = 0; i < ast.body.length; i++) {
        const node = ast.body[i];
        if (node.type === "ImportDeclaration") {
            lastImportIndex = i;
            if (node.source.value === importSource) {
                hasImport = true;
            }
        }
    }

    // 2. Check if mount already exists and detect router variable name
    let hasMount = false;
    let lastMountIndex = -1;
    let routerVarName = "routes";

    for (let i = 0; i < ast.body.length; i++) {
        const node = ast.body[i];
        if (
            node.type === "ExpressionStatement" &&
            node.expression?.type === "CallExpression" &&
            node.expression.callee?.type === "MemberExpression" &&
            node.expression.callee.property?.name === "route"
        ) {
            routerVarName = node.expression.callee.object?.name ?? "routes";
            lastMountIndex = i;
            const firstArg = node.expression.arguments?.[0];
            if (firstArg?.value === routeMountPath) {
                hasMount = true;
            }
        }
    }

    if (hasImport && hasMount) {
        return { alreadyHooked: true, parentRouterPath };
    }

    // 3. Inject Import if missing
    if (!hasImport) {
        const newImportNode = {
            type: "ImportDeclaration",
            specifiers: [
                {
                    type: "ImportDefaultSpecifier",
                    local: { type: "Identifier", name: variableName }
                }
            ],
            source: {
                type: "Literal",
                value: importSource,
                raw: JSON.stringify(importSource)
            }
        };

        const insertAt = lastImportIndex >= 0 ? lastImportIndex + 1 : 0;
        ast.body.splice(insertAt, 0, newImportNode);
        if (lastMountIndex >= insertAt) {
            lastMountIndex++;
        }
    }

    // 4. Inject Route Mount if missing
    if (!hasMount) {
        const newMountNode = {
            type: "ExpressionStatement",
            expression: {
                type: "CallExpression",
                callee: {
                    type: "MemberExpression",
                    object: { type: "Identifier", name: routerVarName },
                    property: { type: "Identifier", name: "route" }
                },
                arguments: [
                    { type: "Literal", value: routeMountPath, raw: JSON.stringify(routeMountPath) },
                    { type: "Identifier", name: variableName }
                ]
            }
        };

        const insertAt = lastMountIndex >= 0 ? lastMountIndex + 1 : ast.body.length - 1;
        ast.body.splice(insertAt, 0, newMountNode);
    }

    const updatedCode = generate(ast).trim() + "\n";
    fs.writeFileSync(parentRouterPath, updatedCode, "utf8");

    return {
        alreadyHooked: false,
        parentRouterPath,
        updated: true
    };
}
