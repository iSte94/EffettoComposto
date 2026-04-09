const puppeteer = require('puppeteer');

const tests = [
  { ral: '20000', mensilita: '#mensilita-14', region: 'Toscana', pubblico: false, apprendistato: false },
  { ral: '30000', mensilita: '#mensilita-13', region: 'Lombardia', pubblico: false, apprendistato: false },
  { ral: '40000', mensilita: '#mensilita-12', region: 'Lazio', pubblico: true, apprendistato: false },
  { ral: '25000', mensilita: '#mensilita-14', region: 'Veneto', pubblico: false, apprendistato: true },
  { ral: '65000', mensilita: '#mensilita-13', region: 'Umbria', pubblico: false, apprendistato: false },
];

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const results = [];

    try {
        for (let i = 0; i < tests.length; i++) {
            const t = tests[i];
            console.log(`Running test ${i+1}: RAL ${t.ral}`);
            await page.goto('https://www.stipendee.it/', {waitUntil: 'networkidle2'});

            // Wait for form
            await page.waitForSelector('#ral');

            // Type RAL
            await page.type('#ral', t.ral);
            
            // Select region
            await page.select('#regione', t.region);

            // Select mensilita
            await page.evaluate((sel) => { document.querySelector(sel).click(); }, t.mensilita);

            // Toggles
            if (t.pubblico) {
                await page.evaluate(() => { document.querySelector('label span[onclick="check(\\\'dipendente-pubblico\\\');"]').click(); });
            }
            if (t.apprendistato) {
                await page.evaluate(() => { document.querySelector('label span[onclick="check(\\\'apprendistato\\\');"]').click(); });
            }

            // Click Calcola
            await page.evaluate(() => { document.querySelector('#toggleButton').click(); });

            // Wait a moment for calculation
            await new Promise(r => setTimeout(r, 1000));

            // Extract tables
            const tables = await page.evaluate(() => {
                const trs = document.querySelectorAll('table tr');
                return Array.from(trs).map(tr => tr.innerText).filter(text => text.includes('€') || text.includes('Annua') || text.includes('Mensile') || text.includes('IRPEF'));
            });

            results.push({ test: t, output: tables });
        }

        console.log(JSON.stringify(results, null, 2));
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
