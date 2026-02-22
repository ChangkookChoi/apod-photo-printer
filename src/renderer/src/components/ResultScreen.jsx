import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react'; 
import { toPng } from 'html-to-image';
import { isElectron } from '../utils/env';
import logoDark from '../assets/logo_dark.png';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); 

  // 완벽하게 검증된(Base64) 이미지만 담을 State
  const [nasaImageSrc, setNasaImageSrc] = useState(null);
  const [logoImageSrc, setLogoImageSrc] = useState(null);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || (isElectron() ? 'auto' : 'A4'));
    setOrientation(localStorage.getItem('target_orientation') || 'portrait');
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const timer = setTimeout(() => onHome(), 60000);
    return () => clearTimeout(timer);
  }, [onHome]);

  // ★ [핵심 1] 이미지를 다운로드하여 순수한 Base64로만 추출하는 헬퍼 함수
  const getBase64Image = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(`Load failed: ${url}`));
      img.src = url;
    });
  };

  // 컴포넌트 마운트 시 이미지들을 안전하게 변환
  useEffect(() => {
    if (!data) return;

    const prepareImages = async () => {
      // NASA 이미지 준비
      if (data.media_type === 'image') {
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(data.url || data.hdurl)}&w=1200&q=90&output=jpg`;
        try {
          const b64 = await getBase64Image(proxyUrl);
          setNasaImageSrc(b64);
        } catch(e) {
          console.error("NASA 이미지 변환 실패", e);
          setNasaImageSrc(proxyUrl); // 실패 시 원본 링크로 최후의 보루
        }
      } else {
        setNasaImageSrc('video');
      }

      // 로고 이미지 준비 (Vercel 에러 차단)
      try {
        const b64Logo = await getBase64Image(logoDark);
        setLogoImageSrc(b64Logo);
      } catch(e) {
        console.error("로고 파일 로드 실패 (Vercel 라우팅 우회)", e);
        setLogoImageSrc('error'); // 캡처 엔진이 Vercel URL을 읽지 못하도록 'error' 처리
      }
    };

    prepareImages();
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
    style: {
      margin: '0',
      padding: '60px 40px', // ★ 상하 60px 완벽 대칭 유지
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    filter: (node) => {
      // 캡처 불량 및 외부 링크 패치 시도를 막는 강력한 필터
      const tag = node.tagName?.toLowerCase();
      if (tag === 'link' || tag === 'style' || tag === 'script') return false;
      return true;
    }
  });

  const handleCapture = async (type) => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      const printArea = document.getElementById('print-area-wrapper');
      if (!printArea) throw new Error("캡처 영역을 찾을 수 없습니다.");

      // iOS Safari 최적화: toPng를 먼저 돌려 브라우저 렌더링 강제 완료
      if (isMobile) {
        await toPng(printArea, getCaptureOptions()).catch(() => {});
      }

      // ★ [핵심 2] 가장 안정적인 toPng로 뽑은 뒤 Blob으로 변환하여 공유/저장
      const dataUrl = await toPng(printArea, getCaptureOptions());
      
      if (type === 'share' || (type === 'download' && isMobile && navigator.share)) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `APOD_${data.date}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '우주에서 온 포토카드' });
        } else {
          throw new Error("브라우저가 파일 공유를 지원하지 않습니다.");
        }
      } else {
        const link = document.createElement('a');
        link.download = `APOD_${data.date}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('처리 중 오류:', error);
      alert(`[저장/공유 실패]\n${error.message || error}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const isLandscape = orientation === 'landscape';
  // 이미지가 처리 중인지 확인
  const isImagesReady = nasaImageSrc !== null && logoImageSrc !== null;

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

      <div id="print-area-wrapper" className="my-auto flex flex-col items-center justify-center bg-transparent mx-auto">
        <div className="bg-[#f9f9f7] shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:shadow-none border border-white/20 print:border-0
                        w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[35vw] xl:w-[28vw]
                        p-4 md:p-6 pb-12 md:pb-20 flex flex-col items-center">
          
          {/* 1. 이미지 영역 */}
          <div className="w-full aspect-square bg-black overflow-hidden relative mb-6 md:mb-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] flex items-center justify-center">
            {data.media_type === 'image' ? (
              nasaImageSrc && nasaImageSrc !== 'video' ? (
                <img 
                  src={nasaImageSrc} 
                  className="w-full h-full object-cover" 
                  alt="NASA APOD" 
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="text-gray-500 animate-pulse text-sm font-medium">우주 사진 인화 중...</div>
              )
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
              {/* QR 코드는 무조건 SVG로 렌더링하여 캡처 증발 방지 */}
              <QRCodeSVG 
                value={data.hdurl || data.url} 
                size={isMobile ? 64 : 100} 
                bgColor={"#f9f9f7"} 
                fgColor={"#111827"} 
                level={"M"} 
              />
              <span className="text-gray-900 text-[10px] md:text-xs font-black mt-2 mb-2 tracking-tighter uppercase">View Original</span>
              
              {/* 로고 영역: Vercel 라우팅 오류가 나면 아예 렌더링하지 않음 */}
              {logoImageSrc && logoImageSrc !== 'error' ? (
                <img src={logoImageSrc} alt="With Light" className="h-5 md:h-7 mt-1 object-contain opacity-80 mix-blend-multiply" />
              ) : (
                <div className="h-5 w-16 bg-transparent mt-1"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {isCapturing ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg animate-pulse flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            캡처 최적화 중...
          </div>
        ) : !isImagesReady ? (
          <div className="px-6 py-3 bg-gray-600 rounded-xl font-bold text-white shadow-lg animate-pulse">
            사진 준비 중...
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