import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const distDir = path.resolve(".output/chrome-mv3");
const cwsDir = path.resolve(".output/chrome-mv3-cws");
const zipFile = path.resolve(".output/AmniShield-Browser-Extension-CWS.zip");
const legacyZipFile = path.resolve(".output/AmnShield-Browser-Extension-CWS.zip");

if (!fs.existsSync(distDir)) {
  console.error("Error: .output/chrome-mv3 does not exist. Run wxt build first.");
  process.exit(1);
}

if (fs.existsSync(cwsDir)) {
  fs.rmSync(cwsDir, { recursive: true, force: true });
}
fs.mkdirSync(cwsDir, { recursive: true });

fs.cpSync(distDir, cwsDir, { recursive: true });

const manifestPath = path.join(cwsDir, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
delete manifest.key;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

if (fs.existsSync(zipFile)) {
  fs.rmSync(zipFile, { force: true });
}
if (fs.existsSync(legacyZipFile)) {
  fs.rmSync(legacyZipFile, { force: true });
}

if (process.platform === "win32") {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${cwsDir}\\*' -DestinationPath '${zipFile}' -Force"`);
} else {
  try {
    execSync(`zip -r "${zipFile}" .`, { cwd: cwsDir, stdio: "inherit" });
  } catch (err) {
    execSync(`tar -a -c -f "${zipFile}" -C "${cwsDir}" .`, { stdio: "inherit" });
  }
}

// Ensure legacy compatibility copy exists
fs.copyFileSync(zipFile, legacyZipFile);

console.log("[OK] CWS Zip Built Successfully:", zipFile);
