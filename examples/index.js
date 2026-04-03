"use strict";

const fs = require("fs").promises;
const path = require("path");
const serialize = require("../src/serialize");

/**
 * Recursively searches for the first .json file in a directory.
 */
async function findFirstJson(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    // Sort entries to ensure deterministic behavior (files before folders)
    const sorted = entries.sort((a, b) => (a.isFile() === b.isFile() ? 0 : a.isFile() ? -1 : 1));

    for (const entry of sorted) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await findFirstJson(fullPath);
        if (found) return found;
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        return fullPath;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function run(input) {
  
  if (!input) {
    console.log("Usage: node examples/index.js <filename-or-folder>");
    return;
  }

  // 1. Resolve path relative to where the terminal is (Project Root / Absolute)
  let targetPath = path.resolve(process.cwd(), input);

  try {
    // Check if path exists at root/absolute level
    await fs.access(targetPath);
  } catch (e) {
    // 2. Fallback: Resolve relative to this script's location (examples/ folder)
    targetPath = path.resolve(__dirname, input);
  }

  try {
    const stats = await fs.stat(targetPath);
    let jsonFile = targetPath;

    // If input is a directory, find the first JSON file inside it
    if (stats.isDirectory()) {
      jsonFile = await findFirstJson(targetPath);
    }

    if (!jsonFile || !jsonFile.toLowerCase().endsWith(".json")) {
      throw new Error(`Target does not contain a valid JSON file: ${targetPath}`);
    }

    // 3. Read and Serialize JSON
    const jsonContent = await fs.readFile(jsonFile, "utf8");
    const jsonData = JSON.parse(jsonContent);

    console.log("=== Input ===");
    console.log(JSON.stringify(jsonData, null, 2));

    console.log(`\n=== MOON Output ===`);
    console.log(serialize(jsonData, { addHints: true, compression: "high" }));

    // 4. Check for companion .toon file (same name, .toon extension)
    const toonFile = jsonFile.replace(/\.json$/i, ".toon");
    try {
      const toonContent = await fs.readFile(toonFile, "utf8");
      console.log(`\n=== TOON Output ===`);
      console.log(toonContent);
    } catch (e) {
      // Silently ignore if no .toon file exists
    }

  } catch (err) {
    console.error(`\n[Error]: ${err.message}`);
    console.log(`Path attempted: ${targetPath}`);
  }
}

run(process.argv[2]);