import React, { useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { isElectron } from '../utils/env';

const ResultScreen = ({ data, onHome }) => {
  // 1. 유휴 상태(60초) 감지 타이머
  useEffect(() => {
    let timer;
    const TIMEOUT_MS = 60000;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        onHome(); 
      }, TIMEOUT_MS);
    };

    resetTimer();
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('mousemove', resetTimer);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
    };
  }, [onHome]);

  if (!data) return <div>데이터 로딩 실패</div>;

  // 2. 출력 핸들러 (프린터 지정 로직 추가)
  const handlePrint = async () => {
    if (isElectron()) {
      try {
        // ★ [수정] 저장된 프린터 이름 가져오기
        const targetPrinter = localStorage.getItem('target_printer_name') || ''; 
        console.log("출력 요청 프린터:", targetPrinter);

        // ★ [수정] 프린터 이름을 인자로 전달
        await window.electron.ipcRenderer.invoke('print-silent', targetPrinter);
        
        alert('🖨️ 프린터로 전송되었습니다!');
        onHome();
      } catch (error) {
        alert('출력 중 오류가 발생했습니다.');
      }
    } else {
      window.print();
    }
  };

  return (
    // [전체 컨테이너]
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col items-center p-8 overflow-y-auto 
                    print:bg-white print:w-screen print:h-screen print:overflow-hidden print:p-8 print:flex print:flex-col print:justify-center">
      
      <style>{`
        @media print {
          @page { size: auto; margin: 0mm; }
          body { margin: 0mm; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {/* [이미지 영역] */}
      <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-700 mb-6 
                      print:border-2 print:border-gray-200 print:rounded-lg print:shadow-none print:mb-4 print:bg-white print:flex-1">
        
        {data.media_type === 'image' ? (
          <img 
            src={data.hdurl || data.url} 
            alt={data.title} 
            className="max-h-full max-w-full object-contain print:w-full print:h-full print:object-cover"
          />
        ) : (
          <div className="text-center p-10 flex flex-col items-center justify-center h-full print:text-black">
            <p className="text-4xl mb-4">🎥</p>
            <p className="text-xl">동영상 콘텐츠입니다.</p>
          </div>
        )}
      </div>

      {/* [하단 정보 및 QR 영역 컨테이너] */}
      <div className="relative w-full max-w-4xl flex justify-center items-center mb-8 print:mb-0 print:text-black">
        
        {/* 1. 텍스트 정보 (항상 중앙 정렬) */}
        <div className="text-center z-10 px-20"> 
          <h2 className="text-3xl font-bold mb-2 print:text-2xl">{data.title}</h2>
          <p className="text-gray-400 mb-2 print:text-gray-600 print:text-sm">{data.date}</p>
          
          <div className="flex flex-col items-center text-xs text-gray-500 space-y-1 print:text-gray-500">
            {data.copyright && <p>Image Credit: {data.copyright}</p>}
            <p>Source: apod.nasa.gov (NASA)</p>
          </div>
        </div>

        {/* 2. QR 코드 (우측 끝 정렬) */}
        <div className="absolute right-0 flex flex-col items-center bg-white p-2 rounded-lg print:p-0">
          <QRCodeCanvas 
            value={data.hdurl || data.url}
            size={70} 
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"M"}
          />
          <span className="text-black text-[8px] font-bold mt-1">SCAN ME</span>
        </div>
      </div>

      {/* [버튼 영역] */}
      <div className="flex gap-6 print:hidden">
        <button 
          onClick={onHome}
          className="px-8 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition"
        >
          처음으로
        </button>
        <button 
          onClick={handlePrint}
          className="px-10 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/30 animate-pulse-slow"
        >
          {isElectron() ? '포토카드 출력하기' : '인쇄 / PDF 저장'}
        </button>
      </div>
    </div>
  );
};

export default ResultScreen;