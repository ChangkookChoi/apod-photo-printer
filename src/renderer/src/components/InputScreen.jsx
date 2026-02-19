import React, { useState } from 'react';
// 1. FreeMode 모듈 추가 임포트
import { Swiper, SwiperSlide } from 'swiper/react';
import { Mousewheel, FreeMode } from 'swiper/modules'; 

import 'swiper/css';
import 'swiper/css/free-mode'; // FreeMode 스타일 추가

const InputScreen = ({ onSubmit, onBack }) => {
  // ... (날짜 데이터 생성 로직은 기존과 동일) ...
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const [selectedYear, setSelectedYear] = useState(2002);
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedDay, setSelectedDay] = useState(1);
  
  // ... (handleSubmit, bgImage 등 기존 동일) ...
  const handleSubmit = () => {
    onSubmit({
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
        day: selectedDay.toString()
    });
  };
  
  const bgImage = "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop";

  return (
    <div className="w-screen h-screen bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden">
       {/* ... (배경 및 타이틀 기존 동일) ... */}
       <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 blur-sm"
        style={{ backgroundImage: `url('${bgImage}')` }}
      ></div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 drop-shadow-lg text-center">
          당신의 생일을 선택해주세요
        </h2>

        <div className="relative flex justify-center w-full max-w-lg h-[300px] mb-12">
          {/* Highlight Bar */}
          <div className="absolute top-1/2 left-0 w-full h-16 -translate-y-1/2 bg-white/10 border-y border-white/30 rounded-lg pointer-events-none z-0 backdrop-blur-[2px]"></div>

          <div className="relative z-10 flex justify-center gap-4 w-full h-full items-center">
            <WheelColumn 
              items={years} 
              unit="년" 
              initialValue={2002}
              onChange={setSelectedYear} 
              width="w-32"
            />
            <WheelColumn 
              items={months} 
              unit="월" 
              initialValue={9}
              onChange={setSelectedMonth} 
              width="w-24"
            />
            <WheelColumn 
              items={days} 
              unit="일" 
              initialValue={1}
              onChange={setSelectedDay} 
              width="w-24"
            />
          </div>
        </div>
        
        {/* ... (버튼 영역 기존 동일) ... */}
        <div className="flex gap-6">
            <button onClick={onBack} className="px-8 py-3 rounded-xl bg-gray-700/60 backdrop-blur hover:bg-gray-600 transition border border-white/10">뒤로가기</button>
            <button onClick={handleSubmit} className="px-12 py-3 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/50 text-lg font-bold hover:bg-blue-500 transition transform hover:scale-105">선택 완료 ✨</button>
        </div>
      </div>
    </div>
  );
};

// 2. WheelColumn 컴포넌트 업그레이드
const WheelColumn = ({ items, unit, initialValue, onChange, width = "w-28" }) => {
  const initialIndex = items.indexOf(initialValue);

  return (
    <div className={`h-full ${width} flex items-center justify-center`}>
      <Swiper
        // FreeMode 모듈 추가
        modules={[Mousewheel, FreeMode]} 
        direction={'vertical'}
        slidesPerView={5}
        centeredSlides={true}
        
        // ★ 핵심 설정 1: 마우스 휠 감도 조절 (sensitivity가 높을수록 많이 돌아감)
        mousewheel={{
          sensitivity: 2.5, // 기본값 1보다 높게 설정
          thresholdDelta: 10, // 작은 떨림 무시
        }}

        // ★ 핵심 설정 2: 프리 모드 + 스티키 (와라락 돌다가 딱 멈춤)
        freeMode={{
          enabled: true,
          sticky: true, // 멈출 때 슬라이드 위치에 딱 맞게 자석처럼 붙음
          momentumRatio: 0.25, // 관성 비율 (낮을수록 빨리 멈춤, 높을수록 오래 돔)
        }}

        initialSlide={initialIndex !== -1 ? initialIndex : 0}
        
        // FreeMode일 때는 onSlideChange 대신 onRealIndexChange나 onProgress 등을 써야 더 정확하지만
        // sticky: true 덕분에 slideChange도 멈출 때 발생합니다.
        onSlideChange={(swiper) => {
          const value = items[swiper.activeIndex];
          onChange(value);
        }}
        className="h-full w-full"
      >
        {items.map((item) => (
          <SwiperSlide key={item} className="flex items-center justify-center">
            {({ isActive }) => (
              <div 
                className={`text-2xl transition-all duration-300 flex items-center justify-center ${
                  isActive 
                    ? 'text-white font-bold scale-110 opacity-100' 
                    : 'text-gray-400 scale-90 opacity-40'
                }`}
              >
                {item}<span className="text-sm ml-1 pt-1">{unit}</span>
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default InputScreen;