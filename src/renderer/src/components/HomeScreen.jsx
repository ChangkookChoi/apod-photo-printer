import React from 'react';
import { isElectron } from '../utils/env'; // ★ [추가] 환경 감지 유틸리티 임포트

const HomeScreen = ({ onStart, onAdminClick }) => {
  
  // ★ [추가] 앱 종료 핸들러
  const handleExit = (e) => {
    e.stopPropagation(); // 부모(배경) 클릭 이벤트로 전파되는 것 방지
    
    // 실수로 터치해서 꺼지는 것을 방지하기 위한 확인 창
    if (window.confirm("키오스크 프로그램을 종료하시겠습니까?")) {
      window.close(); // Electron 창 닫기 (표준 종료 방법)
    }
  };

  return (
    <div 
      onClick={onStart}
      className="relative w-screen h-screen bg-black overflow-hidden cursor-pointer"
    >
      {/* 배경 이미지 */}
      <img 
        src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" 
        alt="Space Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />

      {/* 컨텐츠 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <h1 className="text-6xl font-bold text-white mb-8 tracking-widest drop-shadow-lg text-center">
          UNIVERSE<br/>CARD
        </h1>
        <p className="text-xl text-gray-300 mb-12 font-light">
          당신의 생일, 그 날의 우주를 선물합니다
        </p>

        <div className="animate-pulse bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full border border-white/20">
          <span className="text-2xl text-white font-medium">
            화면을 터치하여 시작하기
          </span>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 text-white/50 text-sm z-20">
        Created by With Light
        Powered by NASA APOD API
      </div>

      {/* ▼▼▼ [추가] 앱 종료 버튼 (우측 상단, Electron 환경에서만 표시) ▼▼▼ */}
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

      {/* 관리자 버튼 (좌측 하단) */}
      <button 
        onClick={(e) => {
          e.stopPropagation(); // 부모 클릭 이벤트 방지
          onAdminClick();
        }}
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