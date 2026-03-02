import React from 'react';
import { isElectron } from '../utils/env';

const LoadingScreen = () => {
  // 프로그램 강제 종료 핸들러
  const handleExit = () => {
    // Electron 환경에서 창을 닫거나 앱을 종료하도록 IPC 통신 혹은 close 호출
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.invoke('quit-app').catch(() => window.close());
    } else {
      window.close();
    }
  };

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center relative">
      
      {/* ★ Electron 키오스크 환경일 때만 나타나는 우측 상단 종료 버튼 */}
      {isElectron() && (
        <button 
          onClick={handleExit}
          className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-red-500 text-white rounded-full transition-colors z-50 flex items-center justify-center"
          title="프로그램 종료"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-blue-500 mb-8"></div>
      <h2 className="text-2xl font-bold animate-pulse">
        우주에서 사진을 가져오는 중... 🛰️
      </h2>
      <p className="text-gray-400 mt-4">NASA 서버와 통신하고 있습니다.</p>
    </div>
  );
};

export default LoadingScreen;