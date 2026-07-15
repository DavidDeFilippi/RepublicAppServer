const fs = require('fs');
const puppeteer = require('puppeteer');
const ftp = require("basic-ftp");
const { Readable } = require("stream");
const path = require('path');
const { enviarNotificacionMasiva } = require('./firebasepush');

// const dir = 'D://Proyectos//';
const dir = '/home/deltafoxtrot/';
const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const imagenGenerica = 'https://sorbeteapps.com/images/pjud_logo.png';
const publicaciones = readJsonAsArray(dir + 'RepublicAppServer/pjud.json');
const noticias = readJsonAsArray(dir + 'RepublicAppServer/noticias.json');

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
    fs.writeFileSync(dir + 'RepublicAppServer/cacheimages/pjud_temp.jpg', buffer);
    console.log('File saved successfully!');
}

async function searchUpdates() {
    const config = {
        headless: 'new', // Set to false if you want to open and see the robot in action
        // headless: false,
        devtools: false, // Open the devtools panel in a non headless mode
        executablePath: "/usr/bin/chromium",
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
        ],
        userDataDir: dir + 'RepublicAppServer/pjudcachedata', // Specify a user data directory to persist session data

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

        await page.waitForSelector('#data-news > div.row.mb-2.col-12', { timeout: 120000 });

        // 1. Extrae solo los datos crudos del DOM (en el navegador)
        const noticiasCrudas = await page.$$eval('#data-news > div.row.mb-2.col-12', elements =>
            elements.map(el => {

                const titulo = el.querySelector('a > h5')?.textContent.trim() || null;
                const linkEl = el.querySelector('a');
                const link = linkEl ? linkEl.href || linkEl.getAttribute('href') : null;
                const dateText = el.querySelector('small.text-muted.pull-right')?.textContent.trim() || null;

                return { titulo, link, dateText };
            })
        );

        // 2. Procesa las fechas y genera el objeto final (en Node.js)
        const noticiasItems = noticiasCrudas.map(item => {
            const date = item.dateText ? getDate(item.dateText) : null;
            let fechaLocal = null;
            let timestamp = null;

            if (date) {
                fechaLocal = `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
                const hh = date.getHours();
                const mm = date.getMinutes();
                const ss = date.getSeconds();

                if (!(hh === 0 && mm === 0 && ss === 0)) {
                    const pad = n => String(n).padStart(2, '0');
                    fechaLocal += ` ${pad(hh)}:${pad(mm)}:${pad(ss)}`;
                }
                timestamp = date.getTime();
            }

            return {
                titulo: item.titulo,
                contenido: 'se va',
                link: item.link,
                fechaLocal,
                timestamp,
                imagen: imagenGenerica,
                categoria: 'Poder Judicial',
                relevancia: 0
            };
        });
        
        // console.log(colores.verde, `Noticias encontradas: ${noticiasItems.length}`);
        // console.log(colores.amarillo, JSON.stringify(noticiasItems, null, 2));

        // Por cada noticia encontrada, verificar si ya existe (por link o titulo) y si no, agregarla
        for (const item of noticiasItems) {
            const publicacionItem = {
                titulo: item.titulo,
                contenido: item.contenido,
                link: item.link,
                imagen: imagenGenerica,
                categoria: item.categoria || 'Poder Judicial',
                date: item.fechaLocal,
                timestamp: item.timestamp,
                relevancia: item.relevancia
            };

            const existe = publicaciones.some(pub => pub.link === publicacionItem.link && pub.titulo === publicacionItem.titulo);

            if (!existe) {
                publicaciones.unshift(publicacionItem);
                noticias.unshift(publicacionItem);
                fs.writeFileSync(dir + 'RepublicAppServer/pjud.json', JSON.stringify(publicaciones, null, 2), 'utf8');
                fs.writeFileSync(dir + 'RepublicAppServer/noticias.json', JSON.stringify(noticias, null, 2), 'utf8');
                try { await enviarNotificacionMasiva(publicacionItem); } catch(e){ console.log(colores.rojo, 'Error notificacion', e); }
                console.log(colores.amarillo, `Nueva noticia agregada: ${item.titulo}`);
            }
        }

    } catch (e) {
        console.log(colores.rojo, 'ERROR:');
        console.log(colores.rojo, e);
    }

    try {
        // remove temp file, ignore if it doesn't exist
        await fs.promises.rm(dir + 'RepublicAppServer/cacheimages/pjud_temp.jpg', { force: true });
    } catch (e) {
        console.error('Failed to remove temp file:', e);
    }

    await browser.close();

    fs.rm(dir + 'RepublicAppServer/pjudcachedata', { recursive: true, force: true }, (err) => {
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

        const fileStream = fs.createReadStream(dir + 'RepublicAppServer/cacheimages/pjud_temp.jpg');

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
    const [datePart, timePart] = dateString.split(" ");
    const dateStringSplit = datePart.split("-");

    d.setDate(Number(dateStringSplit[0]));

    const monthIndex = meses.indexOf(dateStringSplit[1].toLowerCase());

    if (monthIndex >= 0) {
        d.setMonth(monthIndex);
    }

    d.setFullYear(Number(dateStringSplit[2]));

    if (timePart) {
        const [hours, minutes] = timePart.split(":").map(Number);
        d.setHours(Number.isNaN(hours) ? 0 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
    } else {
        d.setHours(0, 0, 0, 0);
    }

    return d;
}

searchUpdates();