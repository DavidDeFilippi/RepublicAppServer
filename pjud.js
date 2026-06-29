const OneSignal = require('@onesignal/node-onesignal');
const fs = require('fs');
const puppeteer = require('puppeteer');
const ftp = require("basic-ftp");
const { Readable } = require("stream");

const dir = 'D://Proyectos//';

async function sendNotification(publicacion) {
    
    // Leer la REST API Key desde el archivo ejemplo.txt dentro de la carpeta indicada
    const OneSignalrestApiKey = fs.readFileSync(dir + 'RepublicApp API Authentication Key.txt', 'utf8').trim(); // Reemplaza lectura desde archivo
    console.log('REST API Key leída:', OneSignalrestApiKey); // Verificar que se ha leído correctamente

    const OneSignalappId = fs.readFileSync(dir + 'RepublicApp App ID.txt', 'utf8').trim(); // Reemplaza con tu App ID
    console.log('App ID leído:', OneSignalappId); // Verificar que se ha leído correctamente

    const OneSignalTemplateId = fs.readFileSync(dir + 'RepublicApp Template ID.txt', 'utf8').trim(); // Reemplaza con tu Template ID
    console.log('Template ID leído:', OneSignalTemplateId); // Verificar que se ha leído correctamente


    // 1. Configuración con tus claves
    const configuration = OneSignal.createConfiguration({
        restApiKey: OneSignalrestApiKey,
    });

    const client = new OneSignal.DefaultApi(configuration);

    const notification = new OneSignal.Notification();
    notification.app_id = OneSignalappId;
    notification.template_id = OneSignalTemplateId;
    notification.headings = { en: publicacion.titulo };
    notification.contents = { en: publicacion.contenido };
    notification.big_picture = publicacion.imagen;
    notification.data = {
        titulo: publicacion.titulo,
        contenido: publicacion.contenido,
        link: publicacion.link,
        imagen: publicacion.imagen,
        categoria: publicacion.categoria,
        date: publicacion.date
    };    
    notification.included_segments = ['Active Subscriptions'];

    const response = await client.createNotification(notification);
    console.log('Notification ID:', response.id);
}

function readJsonAsArray(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) {
        return [];
    }

    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [data];
}

async function searchUpdates() {
    const config = {
        // headless: 'new', // Set to false if you want to open and see the robot in action
        headless: false,
        devtools: false, // Open the devtools panel in a non headless mode
        // executablePath: "chromium",
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
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

        const url = 'https://www.pjud.cl/prensa-y-comunicaciones/noticias-del-poder-judicial';

        console.log(await browser.userAgent());
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

        console.log(colores.amarillo, `\nIngresando a ${url} \n`);

        await page.goto(url, { waitUntil: 'load', timeout: 120000 });

        console.log(colores.verde, `\nIngreso completado \n`);
        console.log(colores.amarillo, `\nEsperando scrap \n`);

        const linkSelector = '#data-news > div:nth-child(1) > a';
        await page.waitForSelector(linkSelector, { timeout: 120000 });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'load', timeout: 120000 }),
            page.click(linkSelector)
        ]);
        console.log(colores.verde, 'Se hizo click en el enlace y se completó la navegación');

        // await page.goBack({ waitUntil: 'load', timeout: 120000 });
        // console.log(colores.verde, 'Volviendo a la página de noticias');

        const headings = await page.$eval('body > section > div > div > div > div > div > div > div > div > div > h3', el => el.textContent.trim());
        console.log(colores.verde, `Texto del titulo enlace: ${headings}`);

        const contents = await page.$eval('body > section > div > div > div > div > div > div > div > div > div > div > div > blockquote', el => el.textContent.trim());
        console.log(colores.verde, `Texto del contenido: ${contents}`);

        const base64Image = await page.$eval('body > section > div > div > div > div > div > div > div > div > div > div > img', el => el.src || el.getAttribute('src'));

        const dateNow = Date.now();

        const ftpRoute = "/public_html/images/pjud"+dateNow+".png";

        const UploadedImage = uploadBase64ToFtp(base64Image, ftpRoute);

        let imagen = 'https://sorbeteapps.com/images/pjud-generico.jpeg';

        if(UploadedImage){
            imagen = "https://sorbeteapps.com/images/pjud"+dateNow+".png";
        }

        console.log(colores.verde, `Imagen src: ${imagen}`);


        // const link = await page.$eval('body > main > section > div > div > div > div > h3 > a', el => el.href || el.getAttribute('href'));
        const link = page.url();
        console.log(colores.verde, `Link del enlace: ${link}`);

        const publicacion = {
            titulo: headings,
            contenido: contents,
            link: link,
            imagen: imagen,
            categoria: 'Poder Judicial',
            date: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };

        const publicaciones = readJsonAsArray('pjud.json');
        const noticias = readJsonAsArray('noticias.json');

        const existePublicacion = publicaciones.some(pub =>
            pub.link === publicacion.link ||
            pub.titulo === publicacion.titulo ||
            pub.contenido === publicacion.contenido
        );

        if (!existePublicacion) {
            publicaciones.unshift(publicacion);
            noticias.unshift(publicacion);

            fs.writeFileSync('pjud.json', JSON.stringify(publicaciones, null, 2), 'utf8');
            fs.writeFileSync('noticias.json', JSON.stringify(noticias, null, 2), 'utf8');
            console.log(colores.verde, 'Publicación guardada en JSON como array:', JSON.stringify(publicaciones, null, 2));

            sendNotification(publicacion).catch(error => {
                console.error('Error al enviar la notificación:', error);
            });

        }else{
            console.log(colores.amarillo, 'La publicación ya existe en el archivo JSON. No se guardará ni se enviará notificación.');
        }


    } catch (e) {
        console.log(colores.rojo, 'ERROR:');
        console.log(colores.rojo, e);
    }

    await browser.close();
}

async function uploadBase64ToFtp(base64String, remoteFileName) {
    const client = new ftp.Client();
    let success = false;
    // Set a timeout in milliseconds (e.g., 30 seconds)
    client.ftp.verbose = true; 

    try {
        // 1. Connect to your FTP server
        const ftpCredentials = JSON.parse(fs.readFileSync(dir+'ftp.json', 'utf8'));
        await client.access({
            host: ftpCredentials.host,
            user: ftpCredentials.user,
            password: ftpCredentials.password,
            secure: true // Set true for FTPS, false for plain FTP
        });

        // 2. Clean the Base64 string and convert it to a Buffer
        const cleanBase64 = base64String.replace(/^data:.\/*;base64,/, "");
        const fileBuffer = Buffer.from(cleanBase64, 'base64');

        // 3. Convert the Buffer into a readable stream for the FTP client
        const fileStream = Readable.from(fileBuffer);

        // 4. Upload the stream to the remote path
        console.log("Uploading file...");
        await client.uploadFrom(fileStream, remoteFileName);
        console.log("Upload successful!");
        success = true;

    } catch (err) {
        console.error("FTP Upload failed:", err);
        success = false;
    } finally {
        // 5. Always close the connection
        client.close();
    }

    return success;
}



searchUpdates();