const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const https = require("https");

const TIERS = [
  "iron", "bronze", "silver", "gold", "platinum",
  "emerald", "diamond", "master", "grandmaster", "challenger",
];

const BASE_URL = "https://opgg-static.akamaized.net/images/medals_new";
const OUT_DIR = path.join(__dirname, "..", "public", "emblems");

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const tier of TIERS) {
    const url = `${BASE_URL}/${tier}.png`;
    console.log(`Downloading ${tier}...`);
    const buf = await download(url);
    const outPath = path.join(OUT_DIR, `${capitalize(tier)}.png`);
    await sharp(buf).resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`  ${capitalize(tier)}.png: ${stat.size} bytes (128x128)`);
  }

  console.log("\nDone! All emblems saved to public/emblems/");
}

main().catch((e) => { console.error(e); process.exit(1); });
