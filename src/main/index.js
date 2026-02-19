import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow() {
  // 1. 현재 메인 모니터의 크기 정보를 가져옵니다.
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    show: false,
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

// ▼▼▼ [추가 1] 프린터 목록 가져오기 핸들러 ▼▼▼
ipcMain.handle('get-printers', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return [];
  // Electron에서 연결된 프린터 목록을 반환합니다.
  return await win.webContents.getPrintersAsync();
});

// ▼▼▼ [수정] 출력 요청 처리기 (프린터 이름 지원) ▼▼▼
ipcMain.handle('print-silent', async (event, printerName) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false };

  try {
    const options = {
      silent: true,
      printBackground: true,
      deviceName: printerName || '', // ★ 전달받은 프린터 이름 사용 (없으면 기본값)
      margins: { marginType: 'none' }
    };

    // 실제 프린터가 연결되어 있지 않은 개발 환경에서는 PDF 저장이 될 수도 있습니다.
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