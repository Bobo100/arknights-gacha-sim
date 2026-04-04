const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
async function downloadImage() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      //   "--disable-gpu",
      "--start-maximized",
      //   "--window-size=1920x1080",
    ],
    defaultViewport: null,
  });

  let pages = await browser.pages();
  let page = pages[0];
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
  );

  const officialJsonPath = path.join(__dirname, "../src/json/official.json");
  let json;
  try {
    const data = await fs.promises.readFile(officialJsonPath, "utf8");
    json = JSON.parse(data);
  } catch (err) {
    console.error("Failed to read official.json:", err.message);
    await browser.close();
    return;
  }

  await browser.close(); // browser not needed for axios downloads

  let downloaded = 0, skipped = 0, failed = 0;
  console.log(`\nDownloading half images for ${json.length} operators...`);

  for (const element of json) {
    const dir = path.join(__dirname, "../src/image", element["cn"]);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const destPath = path.join(__dirname, "../src/image", element["cn"], `${element["cn"]}-half.png`);
    const alreadyExists = fs.existsSync(destPath);

    process.stdout.write(`  ${element["cn"]} ... `);
    await downloadSingleImage(element);

    if (fs.existsSync(destPath) && !alreadyExists) {
      downloaded++;
      console.log("downloaded");
      await delay(1000); // rate limit only when actually downloading
    } else if (alreadyExists) {
      skipped++;
      console.log("skip");
    } else {
      failed++;
      console.log(""); // newline after (failed:xxx)
    }
  }

  console.log(`\nDone. Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`);
}

async function downloadSingleImage(element) {
  const destPath = path.join(__dirname, "../src/image", element["cn"], `${element["cn"]}-half.png`);

  if (fs.existsSync(destPath) || !element["half"]) {
    return;
  }

  // Convert thumbnail URL to full-size image URL
  // //prts.wiki/images/thumb/a/ab/File.png/110px-File.png  →  https://media.prts.wiki/a/ab/File.png
  let imageUrl = "https:" + element["half"];
  imageUrl = imageUrl
    .replace("//prts.wiki/images/thumb/", "//media.prts.wiki/")
    .replace(/\/\d+px-[^/]+$/, "");

  try {
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "stream",
      timeout: 15000,
      validateStatus: (status) => status < 400,
    });
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (err) {
    const status = err.response ? err.response.status : "network";
    process.stdout.write(`(failed:${status}) `);
    // Clean up partial file if it exists
    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }
  }
}

(async () => {
  await downloadImage();
})().catch((err) => {
  console.error("Fatal error in image downloader:", err.message);
  process.exit(1);
});
