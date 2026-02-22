import React, { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // ★ <img>가 아닌 <canvas>로 렌더링
import { toPng, toBlob } from 'html-to-image';
import { isElectron } from '../utils/env';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); 
  
  // ★ [핵심] <img> 태그 대신 사용할 캔버스 참조
  const imageCanvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || (isElectron() ? 'auto' : 'A4'));
    setOrientation(localStorage.getItem('target_orientation') || 'portrait');
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const timer = setTimeout(() => onHome(), 60000);
    return () => clearTimeout(timer);
  }, [onHome]);

  // ★ [복구된 핵심 로직] <img> 태그를 쓰지 않고 Canvas에 직접 물감처럼 그리기
  useEffect(() => {
    if (!data) return;
    if (data.media_type !== 'image') {
      setImgLoaded(true); // 비디오일 경우 캔버스 처리 패스
      return; 
    }
    
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(data.url || data.hdurl)}&w=1200&q=90&output=jpg`;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 브라우저 보안 에러(Tainted Canvas) 우회
    
    img.onload = () => {
      const canvas = imageCanvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0); 
        setImgLoaded(true);
      }
    };
    img.onerror = (err) => {
      console.error("캔버스 이미지 드로잉 실패:", err);
      // 실패하더라도 화면이 무한 로딩에 빠지지 않도록 처리
      setImgLoaded(true); 
    };
    img.src = proxyUrl; 
  }, [data]);

  if (!data) return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">데이터 로딩 실패</div>;

  const handlePrint = async () => {
    setIsPrinting(true); 
    if (isElectron()) {
      try {
        const targetPrinter = localStorage.getItem('target_printer_name') || ''; 
        await window.electron.ipcRenderer.invoke('print-silent', targetPrinter);
        setTimeout(() => { setIsPrinting(false); onHome(); }, 3000);
      } catch (e) {
        setIsPrinting(false); 
      }
    } else {
      window.print();
      setIsPrinting(false);
    }
  };

  const getCaptureOptions = () => ({
    backgroundColor: '#111827',
    pixelRatio: 2,
    skipFonts: true,
    style: {
      margin: '0',
      padding: '60px 40px', // ★ 상하 60px 대칭 여백 유지
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    // <link> 등 불필요한 태그 캡처 방지
    filter: (node) => {
      const tag = node.tagName?.toLowerCase();
      if (tag === 'link' || tag === 'style' || tag === 'script') return false;
      return true;
    }
  });

  const handleCapture = async (type) => {
    if (isCapturing) return;
    setIsCapturing(true);
    await new Promise(res => setTimeout(res, 300)); // UI 렌더링 대기

    try {
      const printArea = document.getElementById('print-area-wrapper');
      if (!printArea) throw new Error("캡처 영역 누락");

      const blob = await toBlob(printArea, getCaptureOptions());
      if (!blob) throw new Error("이미지 생성 실패");

      if (type === 'share' || (type === 'download' && isMobile && navigator.share)) {
        const file = new File([blob], `APOD_Photocard_${data.date}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '우주에서 온 포토카드' });
        } else {
          throw new Error("공유 기능을 지원하지 않는 기기입니다.");
        }
      } else {
        const dataUrl = await toPng(printArea, getCaptureOptions());
        const link = document.createElement('a');
        link.download = `APOD_Photocard_${data.date}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      alert(`[오류 발생]\n${error.message || error}`);
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
          #print-area-wrapper { width: 100%; height: 100%; display: flex !important; justify-content: center; align-items: center; }
        }
      `}</style>

      {/* 캡처를 위한 최상위 래퍼 */}
      <div id="print-area-wrapper" className="my-auto flex flex-col items-center justify-center bg-transparent mx-auto">
        <div className="bg-[#f9f9f7] shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:shadow-none border border-white/20 print:border-0
                        w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[35vw] xl:w-[28vw]
                        p-4 md:p-6 pb-12 md:pb-20 flex flex-col items-center">
          
          {/* 1. 이미지 영역 (<img> 완전히 제거, Canvas만 사용) */}
          <div className="w-full aspect-square bg-black overflow-hidden relative mb-6 md:mb-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
            {data.media_type === 'image' ? (
              <>
                {!imgLoaded && <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-sm font-medium">사진 인화 중...</div>}
                <canvas 
                  ref={imageCanvasRef}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} 
                />
              </>
            ) : (
              <div className="text-center p-10 flex flex-col items-center justify-center h-full text-black">
                <p className="text-5xl mb-4 text-white">🎥</p>
                <p className="text-xl font-bold text-white">Video Content</p>
              </div>
            )}
          </div>

          {/* 2. 하단 정보 영역 */}
          <div className="w-full flex justify-between items-end px-1 gap-6 text-gray-900">
            <div className="flex flex-col flex-1 min-w-0 text-left"> 
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold break-keep leading-tight mb-2 tracking-tighter">
                {data.title}
              </h2>
              <p className="text-gray-500 text-base md:text-lg lg:text-xl font-semibold mb-4 italic">
                {data.date}
              </p>
              <div className="text-[10px] md:text-xs lg:text-sm text-gray-400 font-medium leading-snug uppercase tracking-widest">
                {data.copyright && <p className="truncate text-left">ⓒ {data.copyright}</p>}
                <p className="text-left font-bold text-gray-500">Powered by NASA APOD</p>
              </div>
            </div>

            <div className="flex flex-col items-center flex-shrink-0">
              {/* QR코드 (캔버스로 생성되어 캡처 에러 방지) */}
              <QRCodeCanvas 
                value={data.hdurl || data.url} 
                size={isMobile ? 64 : 100} 
                bgColor={"#f9f9f7"} 
                fgColor={"#111827"} 
                level={"M"} 
              />
              <span className="text-gray-900 text-[10px] md:text-xs font-black mt-2 mb-2 tracking-tighter uppercase">View Original</span>
              {/* 클라이언트 요청에 따라 로고 영역 완전히 삭제됨 */}
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {isCapturing ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg animate-pulse flex items-center">
            처리 중...
          </div>
        ) : (
          <>
            <button onClick={onHome} className="px-4 md:px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition text-sm md:text-base shadow-lg">
              처음으로
            </button>
            
            {isElectron() && (
              <button onClick={handlePrint} className="px-6 md:px-10 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 shadow-lg text-sm md:text-base">
                포토카드 출력
              </button>
            )}

            {!isElectron() && (
              <>
                {!isMobile && (
                  <button onClick={handlePrint} className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 shadow-lg text-sm md:text-base">
                    인쇄 / PDF
                  </button>
                )}
                <button onClick={() => handleCapture('download')} className="px-5 md:px-6 py-3 bg-green-600 rounded-xl font-bold hover:bg-green-500 shadow-lg flex items-center gap-2 text-sm md:text-base">
                  <span>📥</span> 저장
                </button>
                {isMobile && (
                  <button onClick={() => handleCapture('share')} className="px-5 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 shadow-lg flex items-center gap-2 text-sm md:text-base">
                    <span>🚀</span> 공유
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