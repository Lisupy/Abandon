const http = require('http');
const url = require('url');
const puppeteer = require('puppeteer');
const md5 = require('md5');
const fs = require('fs');
const log4js = require('log4js');

const logger = log4js.getLogger();
logger.level='debug';

// launch browser
async function getBrowser() {
    const CHROME_PATH = '/opt/google/chrome/chrome';
    const parameter = {
        // executablePath: CHROME_PATH, // uncomment if want to use chrome
        // headless: false,
        ignoreHTTPSErrors: true,
        args: [
            '--safebrowsing-disable-download-protection',
            '--safebrowsing-disable-extension-blacklist',
            '--no-sandbox'
        ]
    };

    const browser = await puppeteer.launch(parameter);
    return browser;
};

// take screenshot
async function screenshot(browser, url) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.authenticate({ username: 'username', password: 'password' });
    try {
        // set 60 seconds timeout
        await page.goto(url, { timeout: 50000});
    } catch (err) {
        logger.debug(url + ' | ' + err.message);
        await page.close();
        return {
            status: 'failed',
            reason: err.message,
            url: url
        };
    }

    await page.waitFor(1000);
    let picture = await page.screenshot({ type: 'jpeg' });
    let landed_url = await page.url();
    let md5val = await md5(picture);
    let file_name = 'picture/' + md5val + '.jpg';

    await fs.writeFile('../' + file_name, picture, (err) => {
        if (err) throw err;
        logger.debug('saving' + ' | ' + page.url() + ' | ' + `${md5val}.jpg`);
    })
    await page.close();
    return {
        'status': 'success',
        'fname': file_name,
        'origin_url': url,
        'landed_url': landed_url,
    };
}

// create http server
getBrowser().then(async browser => {
    console.log("browser launched");
    console.log("listening port: 8080");

    http.createServer(async (request, response) => {
        let req_url = url.parse(request.url, true);
        let query_string = req_url.query;
        // console.log('Debug [ incomimg | ' + query_string.url + ' | ' + ']')
        logger.debug('incomimg | ' + query_string.url);

        let result = await screenshot(browser, query_string.url);

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.write(JSON.stringify(result));
        response.end();
    }).listen(8080);
})
