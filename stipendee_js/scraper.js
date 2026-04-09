const https = require('https');
const fs = require('fs');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
        }).on('error', reject);
    });
}

(async () => {
    console.log('Fetching homepage...');
    const html = await fetch('https://www.stipendee.it/');
    
    // Find all JS chunks
    const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+\.js[^"]*)"/g;
    let match;
    const jsUrls = [];
    while ((match = scriptRegex.exec(html)) !== null) {
        jsUrls.push('https://www.stipendee.it' + match[1]);
    }
    
    console.log(`Found ${jsUrls.length} JS files. Downloading...`);
    
    let foundCode = '';
    
    for (const url of jsUrls) {
        if (!url.includes('framework') && !url.includes('main') && !url.includes('polyfills') && !url.includes('webpack')) {
            const js = await fetch(url);
            // Look for known keywords
            if (js.includes('addizionale') || js.includes('irpef') || js.includes('mensilit') || js.includes('RAL')) {
                console.log(`Found keywords in: ${url}`);
                // Extract ~3000 chars near the match
                const idx = js.indexOf('irpef');
                const start = Math.max(0, idx - 1500);
                const end = Math.min(js.length, idx + 1500);
                foundCode += `\n\n--- FILE: ${url} ---\n\n` + js.substring(start, end);
            }
        }
    }
    
    fs.writeFileSync('extracted_logic.txt', foundCode);
    console.log('Saved to extracted_logic.txt');
})();
