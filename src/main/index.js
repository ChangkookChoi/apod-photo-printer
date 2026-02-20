import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    show: false,
    
    // ★ [수정] 완벽한 키오스크 환경을 위한 옵션 추가
    kiosk: true,         // 빠져나갈 수 없는 전체화면 모드
    fullscreen: true,    // 전체화면
    alwaysOnTop: true,   // 다른 프로그램보다 항상 위에 표시
    autoHideMenuBar: true,
    
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('get-printers', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return [];
  return await win.webContents.getPrintersAsync();
});

ipcMain.handle('print-silent', async (event, printerName) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false };

  try {
    const options = {
      silent: true,
      printBackground: true,
      deviceName: printerName || '', 
      margins: { marginType: 'none' }
    };

    win.webContents.print(options, (success, errorType) => {
      if (!success) console.error("Print failed:", errorType);
    });
    return { success: true };
  } catch (error) {
    console.error('Print failed:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})