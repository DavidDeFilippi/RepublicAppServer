const OneSignal = require('@onesignal/node-onesignal');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const ftp = require("basic-ftp");
const { Readable } = require("stream");
const path = require('path');

// const dir = 'D://Proyectos//';
const dir = '/home/deltafoxtrot/';
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

puppeteer.use(StealthPlugin());

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
    notification.headings = { en: publicacion.categoria };
    notification.contents = { en: publicacion.titulo+': '+publicacion.contenido };
    notification.big_picture = publicacion.imagen;
    notification.ttl = 0;
    notification.data = {
        titulo: publicacion.titulo,
        contenido: publicacion.contenido,
        link: publicacion.link,
        imagen: publicacion.imagen,
        categoria: publicacion.categoria,
        date: publicacion.date,
        timestamp: publicacion.timestamp
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

function isBase64Image(str) {
    // Regex to match a valid Base64 Data URL with an image MIME type
    const regex = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml|\*);base64,[A-Za-z0-9+/]+={0,2}$/;

    return regex.test(str);
}

function base64ToFile(img) {
    // Your base64 string (with or without Data URL prefix)
    const base64Data = img;

    // EXTRAER TODO LO QUE ESTÁ DESPUÉS DE LA PRIMERA COMA
    // Esto elimina cualquier prefijo: data:image/*;base64, data:image/png;base64, etc.
    const cleanBase64 = base64Data.split(',')[1];

    // Si no hay coma, asumimos que ya viene limpio
    if (!cleanBase64) {
        throw new Error('El string base64 no tiene un formato válido (falta la coma)');
    }

    // 2. Convert the clean base64 string into a binary Buffer
    const buffer = Buffer.from(cleanBase64, 'base64');

    // 3. Write the buffer to a file
    fs.writeFileSync(dir + 'RepublicAppServer/cacheimages/senado_temp.jpg', buffer);
    console.log('File saved successfully!');
}

async function searchUpdates() {
    const config = {
        headless: 'new', // Set to false if you want to open and see the robot in action
        // headless: false,
        devtools: false, // Open the devtools panel in a non headless mode
        executablePath: "usr/bin/chromium",
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
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            '--window-size=1920,1080'
        ],
        userDataDir: dir+'RepublicAppServer/senadocachedata', // Specify a user data directory to persist session data
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

        const url = 'https://www.senado.cl/comunicaciones/noticias';

        console.log(await browser.userAgent());
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

        console.log(colores.amarillo, `\nIngresando a ${url} \n`);

        await page.goto(url, { waitUntil: 'load', timeout: 120000 });

        console.log(colores.verde, `\nIngreso completado \n`);
        console.log(colores.amarillo, `\nEsperando scrap \n`);
                
        const headings = await page.$eval('#maincontent > div:nth-child(3) > div > div > div > div:nth-child(2) > div > div > div > div > div > a:nth-child(1) > div > div > div > div > ul > li > p', el => el.textContent.trim());
        console.log(colores.verde, `Texto del titulo enlace: ${headings}`);

        const contents = await page.$eval('#maincontent > div:nth-child(3) > div > div > div > div:nth-child(2) > div > div > div > div > div > a:nth-child(1) > div > div > div > h3', el => el.textContent.trim());
        console.log(colores.verde, `Texto del contenido: ${contents}`);

        const imagenGenerica = 'https://sorbeteapps.com/images/senado_logo.png';

        let imagen = await page.$eval('#maincontent > div:nth-child(3) > div > div > div > div:nth-child(2) > div > div > div > div > div > a:nth-child(1) > div > div > img', el => el.src || el.getAttribute('src')).catch(()=> imagenGenerica);

        const base64Image = isBase64Image(imagen);

        console.log(colores.amarillo, base64Image);

        if (!base64Image && imagen) {
            console.log(colores.amarillo, 'La imagen no está en formato Base64.');
        } else {
            base64ToFile(imagen);
        }

        let fecha = await page.$eval('#maincontent > div:nth-child(3) > div > div > div > div:nth-child(2) > div > div > div > div > div > a:nth-child(1) > div > div > div > p', el => el.textContent.trim());
        console.log(colores.verde, `Fecha de la noticia: ${fecha}`);

        const date = getDate(fecha);

        const fechaLocal = `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;

        const link = await page.$eval('#maincontent > div:nth-child(3) > div > div > div > div:nth-child(2) > div > div > div > div > div > a:nth-child(1)', el => el.href || el.getAttribute('href'));
        console.log(colores.verde, `Link del enlace: ${link}`);
        const publicacion = {
            titulo: headings,
            contenido: contents,
            link: link,
            imagen: imagen,
            categoria: 'Senado de Chile',
            date: fechaLocal,
            timestamp: date.getTime()
        };

        console.log(fechaLocal);

        const publicaciones = readJsonAsArray(dir + 'RepublicAppServer/senado.json');
        const noticias = readJsonAsArray(dir + 'RepublicAppServer/noticias.json');

        const existePublicacion = publicaciones.some(pub =>
            pub.link === publicacion.link ||
            pub.titulo === publicacion.titulo ||
            pub.contenido === publicacion.contenido
        );

        if (!existePublicacion) {
            // const dateNow = Date.now();

            // const remoteFileName = "/public_html/images/senado" + dateNow + ".jpg";

            // const UploadedImage = await uploadBase64ToFtp(remoteFileName);

            // console.log(UploadedImage);

            // if (UploadedImage) {
            //     imagen = "https://sorbeteapps.com/images/senado" + dateNow + ".jpg";
            // } else {
            //     imagen = imagenGenerica;
            // }

            publicacion.imagen = imagen;

            publicaciones.unshift(publicacion);
            noticias.unshift(publicacion);

            fs.writeFileSync(dir + 'RepublicAppServer/senado.json', JSON.stringify(publicaciones, null, 2), 'utf8');
            fs.writeFileSync(dir + 'RepublicAppServer/noticias.json', JSON.stringify(noticias, null, 2), 'utf8');
            // console.log(colores.verde, 'Publicación guardada en JSON como array:', JSON.stringify(publicaciones, null, 2));

            sendNotification(publicacion).catch(error => {
                console.error('Error al enviar la notificación:', error);
            });

        } else {
            console.log(colores.amarillo, 'La publicación ya existe en el archivo JSON. No se guardará ni se enviará notificación.');
        }


    } catch (e) {
        console.log(colores.rojo, 'ERROR:');
        console.log(colores.rojo, e);
    }

    try {
        // remove temp file, ignore if it doesn't exist
        await fs.promises.rm(dir + 'RepublicAppServer/cacheimages/senado_temp.jpg', { force: true });
    } catch (e) {
        console.error('Failed to remove temp file:', e);
    }

    await browser.close();

    fs.rm(dir + 'RepublicAppServer/senadocachedata', { recursive: true, force: true }, (err) => {
        if (err) {
            console.error('Error removing cache data directory:', err);
        } else {
            console.log('Cache data directory removed successfully.');
        }
    });       
}

async function uploadBase64ToFtp(remoteFileName) {

    const client = new ftp.Client();
    let success = false;
    // Set a timeout in milliseconds (e.g., 30 seconds)
    client.ftp.verbose = true;

    try {
        // 1. Connect to your FTP server
        const ftpCredentials = JSON.parse(fs.readFileSync(dir + 'ftp.json', 'utf8'));
        await client.access({
            host: ftpCredentials.host,
            user: ftpCredentials.user,
            password: ftpCredentials.password,
            secure: false // Set true for FTPS, false for plain FTP
        });

        const fileStream = fs.createReadStream(dir + 'RepublicAppServer/cacheimages/senado_temp.jpg');

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

function getDate(dateString) {
    let d = new Date();
    
    const dateStringSplit = dateString.replaceAll(" de ", " ").split(" ");

    d.setDate(Number(dateStringSplit[0]));

    const monthIndex = meses.indexOf(dateStringSplit[1].toLowerCase());

    if (monthIndex >= 0) {
        d.setMonth(monthIndex);
    }

    d.setFullYear(Number(dateStringSplit[2]));

    d.setHours(0, 0, 0, 0);

    return d;
}

searchUpdates();