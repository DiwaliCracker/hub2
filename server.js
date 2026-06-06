const express = require('express');
const { chromium } = require('playwright');
const app = express();

let browserInstance = null;

async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
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
        
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 45000 });

        // WAIT and then find all potential download buttons
        const finalUrl = await page.evaluate(() => {
            // A comprehensive list of patterns found in your HubCloud source files
            const selectors = [
                'a#download',
                'a[href*="hubcloud.php"]',
                'a[href*="gamerxyt.com"]',
                'a[href*="hubcloud.one"]',
                'a:contains("10Gbps")',
                'a:contains("FSL")',
                'a:contains("PixelServer")',
                'a#vd' // The "vd" ID found in your hubcloudextractor.ts
            ];

            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.href) return el.href;
            }
            
            // Final desperate attempt: Look for any link with 'googleusercontent'
            const links = Array.from(document.querySelectorAll('a'));
            const gdrive = links.find(a => a.href.includes('googleusercontent.com'));
            return gdrive ? gdrive.href : null;
        });

        await context.close();

        if (!finalUrl) {
            // Debugging: Get the page title to see if we are even on the right page
            const title = await page.title();
            throw new Error(`Link not found on page: ${title}`);
        }
        
        res.redirect(302, finalUrl);
    } catch (error) {
        res.status(500).send(`Browser Error: ${error.message}`);
    }
});

app.listen(3000);
