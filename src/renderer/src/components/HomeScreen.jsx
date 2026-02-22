import React from 'react';
import { isElectron } from '../utils/env';
// ★ [핵심] 이미지를 변수로 import 해옵니다.
import logoWhite from '../assets/logo_white.jpg'; 

const HomeScreen = ({ onStart, onAdminClick }) => {
  const handleExit = (e) => {
    e.stopPropagation(); 
    if (window.confirm("키오스크 프로그램을 종료하시겠습니까?")) {
      window.close(); 
    }
  };

  return (
    <div onClick={onStart} className="relative w-screen h-screen bg-black overflow-hidden cursor-pointer">
      <img 
        src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" 
        alt="Space Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <h1 className="text-6xl font-bold text-white mb-8 tracking-widest drop-shadow-lg text-center">
          UNIVERSE<br/>CARD
        </h1>
        <p className="text-xl text-gray-300 mb-12 font-light">
          당신의 생일, 그 날의 우주를 선물합니다
        </p>
        <div className="animate-pulse bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full border border-white/20">
          <span className="text-2xl text-white font-medium">화면을 터치하여 시작하기</span>
        </div>
      </div>

      {/* ★ [수정] 우측 하단: 기존 텍스트 대신 화이트 로고 배치 */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col items-end opacity-80">
        <img src={logoWhite} alt="With Light Logo" className="h-10 mb-2 object-contain mix-blend-screen" />
        <span className="text-white/50 text-xs">Powered by NASA APOD</span>
      </div>

      {isElectron() && (
        <button 
          onClick={handleExit}
          className="absolute top-8 right-8 z-30 text-white/30 hover:text-white/80 transition p-3 bg-black/20 hover:bg-black/50 rounded-full"
          title="프로그램 종료"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <button 
        onClick={(e) => { e.stopPropagation(); onAdminClick(); }}
        className="absolute bottom-8 left-8 z-30 text-white/30 hover:text-white/80 transition p-2"
        title="Admin Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
};

export default HomeScreen;