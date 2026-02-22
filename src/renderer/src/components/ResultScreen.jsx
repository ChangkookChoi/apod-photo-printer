import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { isElectron } from '../utils/env';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  
  // ★ [추가] 접속한 기기가 모바일(스마트폰, 태블릿)인지 감지
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || (isElectron() ? 'auto' : 'A4'));

    const savedOrientation = localStorage.getItem('target_orientation');
    setOrientation(savedOrientation || 'portrait');

    // UserAgent를 통해 모바일 기기 감지
    const mobileCheck = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);

    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { onHome(); }, 60000);
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

  const handlePrint = async () => {
    setIsPrinting(true); 
    if (isElectron()) {
      try {
        const targetPrinter = localStorage.getItem('target_printer_name') || ''; 
        await window.electron.ipcRenderer.invoke('print-silent', targetPrinter);
        setTimeout(() => {
          setIsPrinting(false);
          onHome();
        }, 3000);
      } catch (error) {
        console.error('출력 오류:', error);
        setIsPrinting(false); 
      }
    } else {
      window.print();
      setIsPrinting(false);
    }
  };

  const handleDownloadImage = async () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;
    
    try {
      const canvas = await html2canvas(printArea, { 
        useCORS: true, 
        backgroundColor: '#ffffff',
        scale: 2 // 고화질 캡처를 위해 해상도 2배 확대
      });
      const link = document.createElement('a');
      link.download = `APOD_Photocard_${data.date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('이미지 저장 에러:', error);
      alert('이미지 저장에 실패했습니다.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '우주에서 온 내 생일 사진',
          text: `${data.title} - 나만의 우주 포토카드를 확인해보세요!`,
          url: window.location.href, 
        });
      } catch (error) {
        console.log('공유가 취소되었거나 에러가 발생했습니다.', error);
      }
    } else {
      alert('현재 브라우저에서는 공유하기 기능을 지원하지 않습니다.\n대신 URL을 복사해주세요!');
    }
  };

  const isLandscape = orientation === 'landscape';

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col items-center p-4 md:p-8 overflow-y-auto overflow-x-hidden
                    print:bg-white print:w-full print:h-full print:p-0 print:m-0 print:block print:overflow-visible">
      
      <style>{`
        @media print {
          @page { 
            size: ${paperSize} ${isLandscape ? 'landscape' : 'portrait'}; 
            margin: 0mm; 
          }
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: white; -webkit-print-color-adjust: exact; }
          #print-area {
            width: 100%; height: 100%; display: flex !important; 
            flex-direction: ${isLandscape ? 'row' : 'column'} !important; 
            justify-content: center; align-items: center; padding: 4mm;
            ${paperSize.includes('A4') && !isElectron() ? `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%;` : ''}
          }
        }
      `}</style>

      {/* [모바일/태블릿 반응형 핵심] 
        가로 모드(isLandscape)일 때, 데스크탑(md:) 이상에서는 좌우(flex-row)로 배치되지만,
        모바일에서는 폭이 좁으므로 강제로 위아래(flex-col)로 쌓이도록 반응형 클래스 적용.
        (프린트나 캡처 시에는 설정된 가로/세로 방향을 엄격하게 유지함)
      */}
      <div id="print-area" className={`w-full flex items-center print:text-black bg-gray-900 print:bg-white p-4 rounded-xl
            ${isLandscape ? 'max-w-5xl flex-col md:flex-row gap-4 md:gap-8' : 'max-w-4xl flex-col gap-4'}`}>
        
        {/* [이미지 영역] */}
        <div className={`relative flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-700 
                        print:border-0 print:rounded-none print:shadow-none print:bg-white
                        ${isLandscape ? 'w-full md:w-[65%] mb-0' : 'w-full mb-2 print:mb-4'}`}>
          {data.media_type === 'image' ? (
            <img src={data.url || data.hdurl} alt={data.title} 
                 className={`max-w-full object-contain print:object-contain 
                 ${isLandscape ? 'max-h-[50vh] md:max-h-[80vh] print:max-h-[90vh]' : 'max-h-[50vh] md:max-h-[60vh] print:max-h-[65vh]'}`} />
          ) : (
            <div className="text-center p-10 flex flex-col items-center justify-center h-full print:text-black min-h-[300px]">
              <p className="text-4xl mb-4">🎥</p>
              <p className="text-xl">동영상 콘텐츠입니다.</p>
            </div>
          )}
        </div>

        {/* [텍스트 및 QR 영역] */}
        <div className={`relative flex items-center 
            ${isLandscape ? 'w-full md:w-[35%] flex-col text-center space-y-4 md:space-y-6' : 'w-full justify-center mb-4 print:mb-0 print:px-4'}`}>
          <div className={`z-10 ${isLandscape ? 'px-0' : 'text-center px-4 md:px-20 print:px-4'}`}> 
            <h2 className={`${isLandscape ? 'text-2xl md:text-4xl print:text-2xl' : 'text-2xl md:text-3xl print:text-xl'} font-bold mb-2 break-keep`}>{data.title}</h2>
            <p className="text-gray-400 mb-2 print:text-gray-600 text-sm md:text-base">{data.date}</p>
            <div className="flex flex-col items-center text-xs text-gray-500 space-y-1 print:text-gray-500">
              {data.copyright && <p>Image Credit: {data.copyright}</p>}
              <p>Source: apod.nasa.gov</p>
            </div>
          </div>

          <div className={`${isLandscape ? 'mt-2 md:mt-4' : 'absolute right-0'} flex flex-col items-center bg-white p-1.5 md:p-2 rounded-lg print:p-0 print:static`}>
            <QRCodeCanvas value={data.hdurl || data.url} size={isLandscape ? (isMobile ? 60 : 100) : 60} bgColor={"#ffffff"} fgColor={"#000000"} level={"M"} />
            <span className="text-black text-[8px] font-bold mt-1">SCAN ME</span>
          </div>
        </div>
      </div>

      {/* [스마트 버튼 영역] */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-6 md:mt-10 mb-8 print:hidden z-50">
        {isPrinting ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse text-sm md:text-base">
            🖨️ 처리 중입니다. 잠시 후 처음으로 돌아갑니다...
          </div>
        ) : (
          <>
            <button onClick={onHome} className="px-4 md:px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition text-sm md:text-base">
              처음으로
            </button>
            
            {/* 1. 키오스크(EXE) 환경: 출력 버튼만 표시 */}
            {isElectron() && (
              <button onClick={handlePrint} className="px-6 md:px-10 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/30 text-sm md:text-base">
                포토카드 출력하기
              </button>
            )}

            {/* 2. 일반 웹 환경 (데스크탑 PC & 모바일) */}
            {!isElectron() && (
              <>
                {/* 데스크탑에서만 인쇄 테스트를 할 수 있도록 버튼 노출 */}
                {!isMobile && (
                  <button onClick={handlePrint} className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg text-sm md:text-base">
                    인쇄 / PDF 저장
                  </button>
                )}
                
                {/* 이미지 저장은 모바일/PC 모두 사용 가능 */}
                <button onClick={handleDownloadImage} className="px-5 md:px-6 py-3 bg-green-600 rounded-xl font-bold hover:bg-green-500 transition shadow-lg flex items-center gap-2 text-sm md:text-base">
                  <span>📥</span> 이미지로 저장
                </button>

                {/* 공유하기는 모바일에서만 노출 (PC는 Web Share API 미지원 브라우저가 많음) */}
                {isMobile && (
                  <button onClick={handleShare} className="px-5 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition shadow-lg flex items-center gap-2 text-sm md:text-base">
                    <span>🚀</span> 공유하기
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResultScreen;