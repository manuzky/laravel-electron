const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let phpProcess = null;
let mainWindow = null;

const HOST = '127.0.0.1';
let PORT = 8000;

// 📄 LOG EN PRODUCCIÓN
const logFile = path.join(app.getPath('userData'), 'k24-log.txt');
function log(msg) {
    try {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {}
}

// 🔴 Captura errores fatales
process.on('uncaughtException', (err) => {
    log('UNCAUGHT: ' + err.message);
});

process.on('unhandledRejection', (err) => {
    log('UNHANDLED: ' + err);
});

// 🔍 Verificar si el servidor está activo
function checkServer(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://${HOST}:${port}`, () => resolve(true));
        req.on('error', () => resolve(false));
        req.end();
    });
}

// 🔄 Buscar puerto disponible
async function findAvailablePort(startPort) {
    let port = startPort;

    while (port < startPort + 100) {
        const isRunning = await checkServer(port);
        if (!isRunning) return port;
        port++;
    }

    throw new Error('No hay puertos disponibles');
}

// 🚀 Iniciar servidor PHP
function startPHPServer(port, phpPath, publicPath) {
    if (!fs.existsSync(phpPath)) {
        log('❌ PHP NO EXISTE: ' + phpPath);
        return false;
    }

    if (!fs.existsSync(publicPath)) {
        log('❌ PUBLIC PATH NO EXISTE: ' + publicPath);
        return false;
    }

    log('✅ PHP PATH: ' + phpPath);
    log('📂 PUBLIC PATH: ' + publicPath);

    try {
        phpProcess = spawn(phpPath, [
            '-S',
            `${HOST}:${port}`,
            '-t',
            publicPath
        ]);

        phpProcess.stdout.on('data', (data) => {
            log('PHP: ' + data.toString());
        });

        phpProcess.stderr.on('data', (data) => {
            log('PHP STDERR: ' + data.toString());
        });

        phpProcess.on('error', (err) => {
            log('❌ ERROR SPAWN PHP: ' + err.message);
        });

        phpProcess.on('close', (code) => {
            log('PHP EXIT: ' + code);
        });

        return true;

    } catch (err) {
        log('❌ EXCEPCIÓN PHP: ' + err.message);
        return false;
    }
}

// 🪟 Crear ventana
function createWindow(url) {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800
    });

    mainWindow.webContents.on('did-fail-load', () => {
        mainWindow.loadURL('data:text/html,<h2>No se pudo conectar a Laravel</h2><p>Revisa el log: k24-log.txt</p>');
    });

    mainWindow.loadURL(url);
}

// ⏳ Esperar servidor
async function waitForServer(port, retries = 30) {
    for (let i = 0; i < retries; i++) {
        const isUp = await checkServer(port);
        if (isUp) return true;
        await new Promise(res => setTimeout(res, 500));
    }
    return false;
}

// 🎯 APP
app.whenReady().then(async () => {

    log('=== APP START ===');

    const isDev = !app.isPackaged;

    const phpPath = isDev
        ? path.join(__dirname, '../php/php.exe')
        : path.join(process.resourcesPath, 'php', 'php.exe');

    const laravelBasePath = isDev
        ? path.join(__dirname, '..')
        : path.join(process.resourcesPath, 'k24');

    const publicPath = path.join(laravelBasePath, 'public');

    log('Modo: ' + (isDev ? 'DEV' : 'PROD'));
    log('ResourcesPath: ' + process.resourcesPath);
    log('LaravelPath: ' + laravelBasePath);

    try {
        PORT = await findAvailablePort(PORT);
    } catch (err) {
        log(err.message);
        createWindow('data:text/html,<h1>Error: sin puertos disponibles</h1>');
        return;
    }

    const started = startPHPServer(PORT, phpPath, publicPath);

    if (!started) {
        createWindow('data:text/html,<h1>Error iniciando PHP</h1><p>Revisa k24-log.txt</p>');
        return;
    }

    const ready = await waitForServer(PORT);

    if (!ready) {
        log('❌ Laravel no respondió');
        createWindow(`data:text/html,<h1>Laravel no inició</h1><p>Puerto: ${PORT}</p><p>Revisa log</p>`);
        return;
    }

    createWindow(`http://${HOST}:${PORT}`);
});

// 🧹 Cerrar
app.on('window-all-closed', () => {
    if (phpProcess && !phpProcess.killed) {
        phpProcess.kill();
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});