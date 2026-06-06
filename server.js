const express = require('express');
const app = express();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function nativeFetch(fetchUrl, referer, cookieString = null) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': referer
    };
    if (cookieString) headers['Cookie'] = cookieString;
    
    const res = await fetch(fetchUrl, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
}

app.get('/extract', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("Missing URL");

    try {
        let cleanUrl = targetUrl.replace(/vifix\.site\/hubcloud/i, 'hubcloud.one/drive');

        // 1. Hop 1
        const html1 = await nativeFetch(cleanUrl, cleanUrl);
        let redirectUrl = html1.match(/(?:var url\s*=\s*|location\.replace\()['"](.*?)['"]/)[1];
        if (redirectUrl.startsWith('/')) redirectUrl = new URL(cleanUrl).origin + redirectUrl;

        // 2. Cookie
        const cookieMatch = html1.match(/stck\(\s*['"](\w+)['"]\s*,/);
        const sessionCookie = cookieMatch ? `${cookieMatch[1]}=s4t` : null;

        // 3. Hop 2
        let html2 = await nativeFetch(redirectUrl, cleanUrl, sessionCookie);
        if (!html2.includes('10Gbps')) {
            await delay(2500);
            html2 = await nativeFetch(redirectUrl, cleanUrl, sessionCookie);
        }

        // 4. Extract 10Gbps Link
        const streamLink = html2.match(/<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?10Gbps/i)[1];

        // 5. HubCDN to Googleusercontent
        const html3 = await nativeFetch(streamLink, redirectUrl);
        let finalStreamUrl = html3.match(/(https?:\/\/[^\s"'<>]*googleusercontent\.com[^\s"'<>]*)/)?.[1];
        
        if (!finalStreamUrl) {
            const reurl = html3.match(/var\s+reurl\s*=\s*["']([^"']+)["']/)?.[1];
            if (reurl && reurl.includes('/dl/?link=')) {
                finalStreamUrl = new URL(reurl, 'https://hubcdn.fans').searchParams.get('link');
            }
        }

        if (finalStreamUrl && finalStreamUrl.includes("dl.php")) {
            finalStreamUrl = new URL(finalStreamUrl, 'https://gamerxyt.com').searchParams.get("link");
        }

        // 6. Direct Video Player Redirect
        res.redirect(302, finalStreamUrl);

    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
});

app.listen(3000, () => console.log('Scraper running'));
