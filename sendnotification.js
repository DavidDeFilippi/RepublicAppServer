const OneSignal = require('@onesignal/node-onesignal');
const fs = require('fs');
import puppeteer from 'puppeteer';

async function sendNotification() {
    const dir = 'C://Proyectos//';
    // Leer la REST API Key desde el archivo ejemplo.txt dentro de la carpeta indicada
    const OneSignalrestApiKey = fs.readFileSync(dir + 'RepublicApp API Authentication Key.txt', 'utf8').trim(); // Reemplaza lectura desde archivo
    console.log('REST API Key leída:', OneSignalrestApiKey); // Verificar que se ha leído correctamente

    const OneSignalappId = fs.readFileSync(dir + 'RepublicApp App ID.txt', 'utf8').trim(); // Reemplaza con tu App ID
    console.log('App ID leído:', OneSignalappId); // Verificar que se ha leído correctamente


    // 1. Configuración con tus claves
    const configuration = OneSignal.createConfiguration({
        restApiKey: OneSignalrestApiKey,
    });

    const client = new OneSignal.DefaultApi(configuration);

    const notification = new OneSignal.Notification();
    notification.app_id = OneSignalappId;
    notification.contents = { en: 'Hello from OneSignal!' };
    notification.headings = { en: 'Push Notification' };
    notification.included_segments = ['Active Subscriptions'];

    const response = await client.createNotification(notification);
    console.log('Notification ID:', response.id);
}

async function searchUpdates() {
    const config = {
        headless: 'new', // Set to false if you want to open and see the robot in action
        // headless: false,
        devtools: false, // Open the devtools panel in a non headless mode
        executablePath: "chromium",
        // executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-web-security',        // opcional, pero ayuda con CORS
            '--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-networking',
            '--disable-client-side-phishing-detection',
            '--disable-sync',
            '--metrics-recording-only',
            '--disable-component-update',
            '--no-default-browser-check',
            '--no-first-run',
            '--mute-audio',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ]
    }

    const colores = { verde: '\x1b[32m%s\x1b[0m', amarillo: '\x1b[33m%s\x1b[0m', rojo: '\x1b[31m%s\x1b[0m' };
    const browser = await puppeteer.launch(config);

    try {
        const page = await browser.newPage();

        // Eliminar propiedad webdriver
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            // También ocultar Chrome DevTools Protocol
            window.chrome = { runtime: {} };
        });

        const url = 'https://www.tvn.cl/en-vivo';

        console.log(await browser.userAgent());
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

        console.log(colores.amarillo, `\nIngresando a ${url} \n`);

        // await page.setRequestInterception(true);

        // let interceptedURL;

        // page.on('request', (request) => {
        //   if (request.url().includes("mdstrm.com/live-stream-playlist") && request.url().includes(".m3u8?")) {
        //     interceptedURL = request.url();
        //     request.abort();
        //   } else {
        //     request.continue();
        //   }
        // });

        // await page.goto(url, { waitUntil: 'load' });   
        await page.goto(url, { waitUntil: 'load', timeout: 120000 });

        // console.log(colores.verde, `\nIngreso completado \n`);
        // console.log(colores.amarillo, `\nEsperando scrap \n`);

        await new Promise(r => setTimeout(r, 10000));

        // sendNotification().catch(error => {
        //     console.error('Error al enviar la notificación:', error);
        // });

        // console.log(interceptedURL)

        // if (interceptedURL !== undefined) {
        //   fs.writeFileSync("/home/deltafoxtrot/flytvtools/3b9c2ebfbdd5a589c85d0e633c1f6ac8.txt", interceptedURL);
        //   console.log(colores.verde, 'Scrap exitoso\n');
        // } else {
        //   console.log(colores.rojo, 'No se pudo recopilar los datos\n');
        // }

    } catch (e) {
        console.log(colores.rojo, 'ERROR:');
        console.log(colores.rojo, e);
    }

    // await browser.close();
}

searchUpdates();