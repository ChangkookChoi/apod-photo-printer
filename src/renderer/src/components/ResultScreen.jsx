import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { isElectron } from '../utils/env';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  
  // ★ [추가] 용지 규격 상태 관리
  const [paperSize, setPaperSize] = useState('auto');

  useEffect(() => {
    // ★ [추가] 화면이 열릴 때 관리자 설정에서 용지 규격 불러오기
    const savedPaperSize = localStorage.getItem('target_paper_size');
    if (savedPaperSize) {
      setPaperSize(savedPaperSize);
    } else {
      // 설정된 값이 없으면 웹은 A4, Electron은 auto를 기본값으로 사용
      setPaperSize(isElectron() ? 'auto' : 'A4 portrait');
    }

    // 1. 유휴 상태(60초) 감지 타이머
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

  // 2. 출력 핸들러
  const handlePrint = async () => {
    setIsPrinting(true); 

    if (isElectron()) {
      try {
        // ★ [유지] 관리자 설정에서 저장한 프린터 이름 불러오기
        const targetPrinter = localStorage.getItem('target_printer_name') || ''; 
        console.log("출력 요청 프린터:", targetPrinter);

        // Main 프로세스(index.js)로 프린터 이름 전달
        await window.electron.ipcRenderer.invoke('print-silent', targetPrinter);
        
        setTimeout(() => {
          onHome();
        }, 3000);
      } catch (error) {
        console.error('출력 오류:', error);
        setIsPrinting(false); 
      }
    } else {
      window.print();
      setTimeout(() => {
        onHome();
      }, 3000);
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col items-center p-8 overflow-y-auto 
                    print:bg-white print:w-full print:h-full print:p-0 print:m-0 print:block">
      
      {/* ★ [수정] 불러온 용지 규격(paperSize)을 CSS에 동적으로 주입 */}
      <style>{`
        @media print {
          @page { 
            size: ${paperSize}; 
            margin: 0mm; 
          }
          body, html { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
            background-color: white; 
            -webkit-print-color-adjust: exact; 
          }
          
          /* 용지 설정이 A4일 때(웹 테스트 등)는 정중앙 강제 배치 */
          ${paperSize.includes('A4') ? `
            #print-area {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 85%;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
          ` : `
            /* 4x6 포토 인화지나 영수증 롤지일 때는 여백 없이 꽉 채우기 */
            #print-area {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 4mm; /* 테두리 잘림 방지 */
            }
          `}
        }
      `}</style>

      {/* 인쇄 영역 */}
      <div id="print-area" className="w-full max-w-4xl flex flex-col items-center">
        
        {/* [이미지 영역] */}
        <div className="relative w-full flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-700 mb-6 
                        print:border-0 print:rounded-none print:shadow-none print:mb-4 print:bg-white print:h-auto">
          {data.media_type === 'image' ? (
            <img 
              src={data.url || data.hdurl} 
              alt={data.title} 
              className="max-h-[60vh] max-w-full object-contain print:w-full print:h-auto print:max-h-[65vh] print:object-cover"
            />
          ) : (
            <div className="text-center p-10 flex flex-col items-center justify-center h-full print:text-black">
              <p className="text-4xl mb-4">🎥</p>
              <p className="text-xl">동영상 콘텐츠입니다.</p>
            </div>
          )}
        </div>

        {/* [하단 정보 및 QR 영역 컨테이너] */}
        <div className="relative w-full flex justify-center items-center mb-8 print:mb-0 print:text-black print:px-4">
          <div className="text-center z-10 px-20 print:px-4"> 
            <h2 className="text-3xl font-bold mb-2 print:text-xl">{data.title}</h2>
            <p className="text-gray-400 mb-2 print:text-gray-600 print:text-sm">{data.date}</p>
            <div className="flex flex-col items-center text-xs text-gray-500 space-y-1 print:text-gray-500">
              {data.copyright && <p>Image Credit: {data.copyright}</p>}
              <p>Source: apod.nasa.gov</p>
            </div>
          </div>

          <div className="absolute right-0 flex flex-col items-center bg-white p-2 rounded-lg print:p-0 print:right-4">
            <QRCodeCanvas 
              value={data.hdurl || data.url}
              size={60} 
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"M"}
            />
            <span className="text-black text-[8px] font-bold mt-1">SCAN ME</span>
          </div>
        </div>
      </div>

      {/* [버튼 영역] */}
      <div className="flex gap-6 mt-auto print:hidden">
        {isPrinting ? (
          <div className="px-10 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse">
            🖨️ 출력 중입니다. 잠시 후 처음으로 돌아갑니다...
          </div>
        ) : (
          <>
            <button onClick={onHome} className="px-8 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition">
              처음으로
            </button>
            <button onClick={handlePrint} className="px-10 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/30 animate-pulse-slow">
              {isElectron() ? '포토카드 출력하기' : '인쇄 / PDF 저장'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResultScreen;