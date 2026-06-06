const express = require('express');
const { chromium } = require('playwright');
const app = express();

let browserInstance = null;

// Warm up the browser once
async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
    }
    return browserInstance;
}

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing URL");

    try {
        const browser = await getBrowser();
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('a', { timeout: 15000 });

        const finalUrl = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const target = links.find(a => a.href.includes('googleusercontent.com') || a.href.includes('hubcdn'));
            return target ? target.href : null;
        });

        await context.close(); // Clean up context, not browser
        if (!finalUrl) throw new Error("Link not found");
        res.redirect(302, finalUrl);
    } catch (error) {
        res.status(500).send(`Server Error: ${error.message}`);
    }
});

app.listen(3000, () => console.log('Scraper live'));
