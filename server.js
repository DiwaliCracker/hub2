const express = require('express');
const { chromium } = require('playwright');
const app = express();

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing URL");

    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        
        // Navigate and wait for the page to be ready
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Wait for the "Download" or "10Gbps" elements to appear
        // This effectively bypasses the 2.5s wait and the 403 challenge
        await page.waitForSelector('a', { timeout: 30000 });

        // Evaluate on the page to find the download link
        const finalUrl = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const target = links.find(a => 
                a.href.includes('googleusercontent.com') || 
                a.href.includes('hubcdn') || 
                a.textContent.includes('10Gbps')
            );
            return target ? target.href : null;
        });

        if (!finalUrl) throw new Error("Could not find final link in browser.");
        
        res.redirect(302, finalUrl);
    } catch (error) {
        res.status(500).send(`Browser Error: ${error.message}`);
    } finally {
        await browser.close();
    }
});

app.listen(3000, () => console.log('Browser-based scraper running'));
