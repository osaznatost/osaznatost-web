import { execFileSync } from "node:child_process";
execFileSync("node", ["scripts/import-wholesale.mjs"], { stdio: "inherit" });
