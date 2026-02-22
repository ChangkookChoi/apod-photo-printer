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

  // ★ [수정] 캡처 옵션: 상하 대칭 여백(padding) 및 iOS 렌더링 최적화
  const getCaptureOptions = () => ({
    backgroundColor: '#111827', // 카드 밖 배경을 앱 전체 테마와 통일
    pixelRatio: 2,
    skipFonts: true,
    style: {
      margin: '0',
      padding: '60px 40px', // 상하 60px, 좌우 40px로 대칭 여백 부여
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
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
    // iOS Safari의 렌더링 동기화를 위해 대기 시간 연장
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const printArea = document.getElementById('print-area-wrapper');
      if (!printArea) throw new Error("캡처 영역 누락");

      if (isMobile && navigator.share) {
        const blob = await toBlob(printArea, getCaptureOptions());
        const file = new File([blob], `APOD_Photocard_${data.date}.png`, { type: 'image/png' });
        
        await navigator.share({
          files: [file],
          title: '포토카드 저장',
        });
      } else {
        const dataUrl = await toPng(printArea, getCaptureOptions());
        const link = document.createElement('a');
        link.download = `APOD_Photocard_${data.date}.png`;
        link.href = dataUrl;
        link.click();
      }
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
      alert('현재 브라우저에서는 공유 기능을 지원하지 않습니다.');
      return;
    }

    setIsCapturing(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const printArea = document.getElementById('print-area-wrapper');
      if (!printArea) throw new Error("캡처 영역 누락");

      const blob = await toBlob(printArea, getCaptureOptions());
      const file = new File([blob], `APOD_Photocard_${data.date}.png`, { type: 'image/png' });

      await navigator.share({ files: [file] });
    } catch (error) {
      console.error('공유 에러:', error);
      alert(`[공유 실패]\n${getErrorMessage(error)}`);
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
          #print-area-wrapper {
            width: 100%; height: 100%; display: flex !important; 
            justify-content: center; align-items: center; padding: 4mm;
          }
        }
      `}</style>

      {/* ★ [수정] 캡처 시 상하 여백을 위해 래퍼(Wrapper) 추가 */}
      <div id="print-area-wrapper" className="my-auto flex flex-col items-center justify-center bg-transparent mx-auto">
        <div 
          className="bg-[#f9f9f7] shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:shadow-none border border-white/20 print:border-0
                        w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[35vw] xl:w-[28vw]
                        p-4 md:p-6 pb-12 md:pb-20 flex flex-col items-center"
        >
          {/* 1. 이미지 영역 */}
          <div className="w-full aspect-square bg-black overflow-hidden relative mb-6 md:mb-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
            {data.media_type === 'image' ? (
              <canvas 
                ref={imageCanvasRef}
                className={`w-full h-full object-cover transition-opacity duration-500
                ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} 
              />
            ) : (
              <div className="text-center p-10 flex flex-col items-center justify-center h-full text-black">
                <p className="text-5xl mb-4 text-white">🎥</p>
                <p className="text-xl font-bold text-white">Video Content</p>
              </div>
            )}
          </div>

          {/* 2. 하단 정보 영역 */}
          <div className="w-full flex justify-between items-end px-1 gap-6">
            <div className="flex flex-col flex-1 min-w-0 text-left"> 
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 break-keep leading-tight mb-2 tracking-tighter">
                {data.title}
              </h2>
              <p className="text-gray-500 text-base md:text-lg lg:text-xl font-semibold mb-4">
                {data.date}
              </p>
              <div className="text-[10px] md:text-xs lg:text-sm text-gray-400 font-medium leading-snug uppercase tracking-widest">
                {data.copyright && <p className="truncate text-left">ⓒ {data.copyright}</p>}
                {/* ★ 문구 유지: Powered by NASA APOD */}
                <p className="text-left">Powered by NASA APOD</p>
              </div>
            </div>

            <div className="flex flex-col items-center flex-shrink-0">
              <QRCodeCanvas 
                value={data.hdurl || data.url} 
                size={isMobile ? 64 : 100} 
                bgColor={"#f9f9f7"} 
                fgColor={"#111827"} 
                level={"M"} 
              />
              <span className="text-gray-900 text-[10px] md:text-xs font-black mt-2 mb-2 tracking-tighter uppercase">View Original</span>
              <img src={logoDark} alt="With Light" className="h-5 md:h-7 mt-1 object-contain opacity-80" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {isPrinting || isCapturing ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse text-sm md:text-base flex items-center shadow-lg">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isCapturing ? '카드 로딩 중...' : '출력 중...'}
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