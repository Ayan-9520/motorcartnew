import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const routerPath = path.join(root, "frontend/src/router/index.tsx");
const router = fs.readFileSync(routerPath, "utf8");

const routes = new Set();
for (const m of router.matchAll(/path:\s*["'`]([^"'`]+)["'`]/g)) {
  routes.add(m[1]);
}

function normalize(p) {
  const noQuery = p.split("?")[0].split("#")[0];
  return noQuery.replace(/\/+$/, "") || "/";
}

function matchesRoute(linkPath) {
  const p = normalize(linkPath);
  if (routes.has(p.replace(/^\//, ""))) return true;
  if (p === "/") return routes.has("") || true;

  const segments = p.replace(/^\//, "").split("/");
  for (const route of routes) {
    const rSeg = route.split("/");
    if (rSeg.length !== segments.length) continue;
    let ok = true;
    for (let i = 0; i < rSeg.length; i++) {
      const rs = rSeg[i];
      const ls = segments[i];
      if (rs.startsWith(":")) continue;
      if (rs !== ls) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

const srcDir = path.join(root, "frontend/src");
const linkRe = /(?:to|href)=\{?\s*["'](\/(?:[^"'#?\\]|\\.)*?)["']/g;
const bad = new Map();

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules") continue;
      walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      const text = fs.readFileSync(full, "utf8");
      for (const m of text.matchAll(linkRe)) {
        const href = m[1];
        if (href.startsWith("//") || href.includes("${")) continue;
        if (!matchesRoute(href)) {
          const rel = path.relative(root, full).replace(/\\/g, "/");
          if (!bad.has(href)) bad.set(href, new Set());
          bad.get(href).add(rel);
        }
      }
    }
  }
}

walk(srcDir);

console.log(`Routes: ${routes.size}`);
console.log(`Potentially unmatched internal links: ${bad.size}\n`);
for (const [href, files] of [...bad.entries()].sort()) {
  console.log(href);
  for (const f of [...files].sort()) console.log(`  - ${f}`);
}
