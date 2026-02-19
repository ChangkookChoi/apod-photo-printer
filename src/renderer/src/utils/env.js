// window.electron 객체가 있으면 'Electron 앱', 없으면 '웹 브라우저'입니다.
export const isElectron = () => {
  return window.electron && window.electron.ipcRenderer;
};

// 웹 배포 환경인지 확인
export const isWeb = () => {
  return !isElectron();
};