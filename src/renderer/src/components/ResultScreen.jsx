import React, { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // ★ QR코드도 canvas로 렌더링됨
import { toPng, toBlob } from 'html-to-image';
import { isElectron } from '../utils/env';
import logoDark from '../assets/logo_dark.png';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(true); 
  
  // ★ [핵심] 모든 이미지를 canvas에 직접 그리기 위한 Ref
  const imageCanvasRef = useRef(null);
  const logoCanvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || (isElectron() ? 'auto' : 'A4'));
    setOrientation(localStorage.getItem('target_orientation') || 'portrait');
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const timer = setTimeout(() => onHome(), 60000);
    return () => clearTimeout(timer);
  }, [onHome]);

  // ★ [복구된 핵심 로직] <img> 태그 절대 금지! 캔버스 붓칠 기법 적용
  useEffect(() => {
    if (!data) return;
    if (data.media_type !== 'image') {
      setIsCapturing(false);
      return;
    }
    
    setIsCapturing(true); 

    // 1. NASA 이미지 캔버스에 그리기
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(data.url || data.hdurl)}&w=1200&q=90&output=jpg`;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // CORS 우회
    
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
      console.error("NASA 이미지 드로잉 실패:", err);
      setIsCapturing(false);
    };
    img.src = proxyUrl; 

    // 2. 로고 이미지도 캔버스에 그리기 (iOS에서 <img> 태그 삭제 방지)
    const logoImg = new Image();
    logoImg.onload = () => {
      const canvas = logoCanvasRef.current;
      if (canvas) {
        canvas.width = logoImg.width;
        canvas.height = logoImg.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(logoImg, 0, 0);
      }
    };
    logoImg.src = logoDark;

  }, [data]);

  if (!data) return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">데이터 로딩 실패</div>;

  const handlePrint = async () => {
    setIsPrinting(true); 
    if (isElectron()) {
      try {
        const targetPrinter = localStorage.getItem('target_printer_name') || ''; 
        await window.electron.ipcRenderer.invoke('print-silent', targetPrinter);
        setTimeout(() => { setIsPrinting(false); onHome(); }, 3000);
      } catch (error) {
        setIsPrinting(false); 
      }
    } else {
      window.print();
      setIsPrinting(false);
    }
  };

  // ★ [디자인 유지] 상하 대칭 여백 설정
  const getCaptureOptions = () => ({
    backgroundColor: '#111827', // 진한 그레이 배경
    pixelRatio: 2,
    skipFonts: true,
    style: {
      margin: '0',
      padding: '60px 40px', // 상하 60px, 좌우 40px 완벽 대칭
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }
  });

  const getErrorMessage = (error) => {
    if (error instanceof Event) return "브라우저 보안 렌더링 차단 (Event)";
    return error?.message || "알 수 없는 에러";
  };

  const captureAndDownload = async (type) => {
    if (isCapturing) return;
    setIsCapturing(true);
    // 렌더링 동기화를 위한 짧은 대기
    await new Promise(res => setTimeout(res, 400)); 

    try {
      const printArea = document.getElementById('print-area-wrapper');
      if (!printArea) throw new Error("캡처 영역 누락");

      if (type === 'share' || (type === 'download' && isMobile && navigator.share)) {
        const blob = await toBlob(printArea, getCaptureOptions());
        const file = new File([blob], `APOD_${data.date}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '포토카드',
          });
        } else {
          throw new Error("파일 공유 미지원");
        }
      } else {
        const dataUrl = await toPng(printArea, getCaptureOptions());
        const link = document.createElement('a');
        link.download = `APOD_${data.date}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('이미지 캡처 에러:', error);
      alert(`[오류 발생]\n${getErrorMessage(error)}`);
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

      {/* ★ 캡처 대상 래퍼 (이 영역 전체가 대칭 여백과 함께 캡처됨) */}
      <div id="print-area-wrapper" className="my-auto flex flex-col items-center justify-center bg-transparent mx-auto">
        
        <div className="bg-[#f9f9f7] shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:shadow-none border border-white/20 print:border-0
                        w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[35vw] xl:w-[28vw]
                        p-4 md:p-6 pb-12 md:pb-20 flex flex-col items-center">
          
          {/* 1. 이미지 영역 (Canvas) */}
          <div className="w-full aspect-square bg-black overflow-hidden relative mb-6 md:mb-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
            {data.media_type === 'image' ? (
              <canvas 
                ref={imageCanvasRef}
                className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} 
              />
            ) : (
              <div className="text-center p-10 flex flex-col items-center justify-center h-full text-black">
                <p className="text-5xl mb-4">🎥</p>
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
                <p className="text-left font-bold text-gray-500">Powered by NASA APOD</p>
              </div>
            </div>

            <div className="flex flex-col items-center flex-shrink-0">
              {/* QR 코드 영역 (QRCodeCanvas 컴포넌트는 자체적으로 <canvas>를 뱉어냄) */}
              <QRCodeCanvas 
                value={data.hdurl || data.url} 
                size={isMobile ? 64 : 100} 
                bgColor={"#f9f9f7"} 
                fgColor={"#111827"} 
                level={"M"} 
              />
              <span className="text-gray-900 text-[10px] md:text-xs font-black mt-2 mb-2 tracking-tighter uppercase">View Original</span>
              
              {/* 로고 영역 (Canvas) */}
              <canvas 
                ref={logoCanvasRef} 
                className="h-5 md:h-7 mt-1 opacity-80 mix-blend-multiply" 
                style={{ width: 'auto' }} // 원본 비율 유지를 위함
              />
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {isPrinting || isCapturing ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse text-sm md:text-base flex items-center shadow-lg">
            카드 준비 중...
          </div>
        ) : (
          <>
            <button onClick={onHome} className="px-4 md:px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition text-sm md:text-base shadow-lg">
              처음으로
            </button>
            
            {isElectron() && (
              <button onClick={handlePrint} className="px-6 md:px-10 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg text-sm md:text-base">
                포토카드 출력
              </button>
            )}

            {!isElectron() && (
              <>
                {!isMobile && (
                  <button onClick={handlePrint} className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg text-sm md:text-base">
                    인쇄 / PDF 저장
                  </button>
                )}
                
                <button onClick={() => captureAndDownload('download')} className="px-5 md:px-6 py-3 bg-green-600 rounded-xl font-bold hover:bg-green-500 transition shadow-lg flex items-center gap-2 text-sm md:text-base">
                  <span>📥</span> 이미지로 저장
                </button>

                {isMobile && (
                  <button onClick={() => captureAndDownload('share')} className="px-5 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition shadow-lg flex items-center gap-2 text-sm md:text-base">
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