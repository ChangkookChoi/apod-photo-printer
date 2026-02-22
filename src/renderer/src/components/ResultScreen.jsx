import React, { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng, toBlob } from 'html-to-image';
import { isElectron } from '../utils/env';
import logoDark from '../assets/logo_dark.png';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(true); 
  
  const imageCanvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || (isElectron() ? 'auto' : 'A4'));

    const savedOrientation = localStorage.getItem('target_orientation');
    setOrientation(savedOrientation || 'portrait');

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

  useEffect(() => {
    if (!data) return;
    if (data.media_type !== 'image') {
      setIsCapturing(false);
      return;
    }
    
    const rawUrl = data.url || data.hdurl;
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&w=1200&q=90&output=jpg`;

    setIsCapturing(true); 

    const img = new Image();
    img.crossOrigin = 'anonymous'; 
    
    img.onload = () => {
      const canvas = imageCanvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0); 
        setImgLoaded(true);
        setIsCapturing(false);
      }
    };
    
    img.onerror = (err) => {
      console.error("캔버스 이미지 드로잉 실패:", err);
      setIsCapturing(false);
    };
    
    img.src = proxyUrl; 
  }, [data]);

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

  const getCaptureOptions = () => ({
    backgroundColor: '#ffffff',
    pixelRatio: isMobile ? 1 : 2,
    style: { margin: '0', padding: '0' },
    filter: (node) => {
      if (node?.tagName === 'LINK' || node?.tagName === 'STYLE') return false;
      return true;
    }
  });

  const getErrorMessage = (error) => {
    if (error instanceof Event) return "브라우저 보안 정책에 의한 렌더링 차단 (Event Error)";
    if (error?.message) return error.message;
    return JSON.stringify(error) || "알 수 없는 에러";
  };

  const handleDownloadImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const printArea = document.getElementById('print-area');
      if (!printArea) throw new Error("캡처 영역 누락");

      const dataUrl = await toPng(printArea, getCaptureOptions());
      
      const link = document.createElement('a');
      link.download = `APOD_Photocard_${data.date}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('이미지 저장 에러:', error);
      alert(`[저장 실패]\n${getErrorMessage(error)}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShare = async () => {
    if (isCapturing) return;
    
    if (!navigator.canShare) {
      alert('현재 브라우저에서는 공유 기능을 지원하지 않습니다.\n(웹사이트 링크만 복사됩니다.)');
      try { await navigator.share({ title: '우주에서 온 내 생일 사진', url: window.location.href }); } catch(e) {}
      return;
    }

    setIsCapturing(true);
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const printArea = document.getElementById('print-area');
      if (!printArea) throw new Error("캡처 영역 누락");

      const blob = await toBlob(printArea, getCaptureOptions());
      if (!blob) throw new Error("이미지 파일(Blob) 생성 실패");
      
      const file = new File([blob], `APOD_Photocard_${data.date}.png`, { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        throw new Error("브라우저가 파일 직접 공유를 허용하지 않습니다.");
      }
    } catch (error) {
      console.error('공유 에러:', error);
      alert(`[공유 실패]\n${getErrorMessage(error)}`);
      try { await navigator.share({ title: '우주에서 온 내 생일 사진', url: window.location.href }); } catch (e) {}
    } finally {
      setIsCapturing(false);
    }
  };

  const isLandscape = orientation === 'landscape';

  return (
    <div className="w-screen min-h-[100dvh] bg-gray-900 text-white flex flex-col items-center p-4 md:p-8 overflow-y-auto overflow-x-hidden
                    print:bg-white print:w-full print:h-full print:p-0 print:m-0 print:block print:overflow-visible">
      
      <style>{`
        @media print {
          @page { size: ${paperSize} ${isLandscape ? 'landscape' : 'portrait'}; margin: 0mm; }
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: white; -webkit-print-color-adjust: exact; }
          #print-area {
            width: 100%; height: 100%; display: flex !important; 
            justify-content: center; align-items: center; padding: 4mm;
            ${paperSize.includes('A4') && !isElectron() ? `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%;` : ''}
          }
        }
      `}</style>

      {/* 반응형 폴라로이드 레이아웃
         max-width를 뷰포트 너비(vw) 기준으로 설정하여 화면이 커질수록 카드도 함께 커집니다.
      */}
      <div 
        id="print-area" 
        className="my-auto w-full flex flex-col relative bg-white shadow-2xl print:shadow-none mx-auto border border-gray-200 print:border-0 
                   max-w-[90vw] sm:max-w-[75vw] md:max-w-[60vw] lg:max-w-[45vw] xl:max-w-[35vw]
                   h-fit p-4 md:p-6 pb-12 md:pb-20"
      >
        
        {/* 1. 이미지 영역 (1:1 비율 유지) */}
        <div className="w-full aspect-square bg-gray-100 overflow-hidden relative mb-6 md:mb-10 shadow-inner">
          {data.media_type === 'image' ? (
            <canvas 
              ref={imageCanvasRef}
              className={`w-full h-full object-cover transition-opacity duration-500
              ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} 
            />
          ) : (
            <div className="text-center p-10 flex flex-col items-center justify-center h-full text-black">
              <p className="text-5xl mb-4">🎥</p>
              <p className="text-xl font-bold">동영상 콘텐츠입니다.</p>
            </div>
          )}
        </div>

        {/* 2. 하단 정보 영역 */}
        <div className="flex justify-between items-end px-1 gap-6">
          
          {/* 텍스트 영역 (좌측) */}
          <div className="flex flex-col flex-1 min-w-0"> 
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black break-keep leading-tight mb-2">
              {data.title}
            </h2>
            <p className="text-gray-600 text-base md:text-lg lg:text-xl font-medium mb-4">
              {data.date}
            </p>
            <div className="text-[10px] md:text-xs lg:text-sm text-gray-400 leading-snug">
              {data.copyright && <p className="truncate">ⓒ {data.copyright}</p>}
              <p>Powered by NASA APOD</p>
            </div>
          </div>

          {/* QR & 로고 영역 (우측) */}
          <div className="flex flex-col items-center flex-shrink-0">
            <QRCodeCanvas 
              value={data.hdurl || data.url} 
              size={isMobile ? 64 : 100} 
              bgColor={"#ffffff"} 
              fgColor={"#000000"} 
              level={"M"} 
            />
            <span className="text-black text-[10px] md:text-xs font-bold mt-2 mb-2 tracking-widest uppercase">Scan Me</span>
            <img src={logoDark} alt="With Light" className="h-5 md:h-7 mt-1 object-contain mix-blend-multiply" />
          </div>

        </div>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {isPrinting || isCapturing ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse text-sm md:text-base flex items-center shadow-lg">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isCapturing ? '데이터를 준비 중입니다...' : '출력 처리 중...'}
          </div>
        ) : (
          <>
            <button onClick={onHome} className="px-4 md:px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition text-sm md:text-base shadow-lg">
              처음으로
            </button>
            
            {isElectron() && (
              <button onClick={handlePrint} className="px-6 md:px-10 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/30 text-sm md:text-base">
                포토카드 출력하기
              </button>
            )}

            {!isElectron() && (
              <>
                {!isMobile && (
                  <button onClick={handlePrint} className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg text-sm md:text-base">
                    인쇄 / PDF 저장
                  </button>
                )}
                
                <button onClick={handleDownloadImage} className="px-5 md:px-6 py-3 bg-green-600 rounded-xl font-bold hover:bg-green-500 transition shadow-lg flex items-center gap-2 text-sm md:text-base">
                  <span>📥</span> 이미지로 저장
                </button>

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