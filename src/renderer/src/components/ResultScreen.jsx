import React, { useEffect, useState } from 'react';
// ★ [핵심 1] 캔버스가 아닌, iOS가 절대 지우지 못하는 SVG 방식으로 QR 생성
import { QRCodeSVG } from 'qrcode.react'; 
import { toPng, toBlob } from 'html-to-image';
import { isElectron } from '../utils/env';
import logoDark from '../assets/logo_dark.png';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); 
  
  // ★ [핵심 2] 이미지를 미리 Base64 텍스트로 바꿔서 저장할 공간
  const [nasaBase64, setNasaBase64] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || (isElectron() ? 'auto' : 'A4'));
    setOrientation(localStorage.getItem('target_orientation') || 'portrait');
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const timer = setTimeout(() => onHome(), 60000);
    return () => clearTimeout(timer);
  }, [onHome]);

  // 백그라운드에서 조용히 이미지들을 Base64로 변환 (화면 멈춤, 백화 현상 방지)
  useEffect(() => {
    if (!data) return;

    // 1. NASA 이미지 변환
    if (data.media_type === 'image') {
      const fetchNasa = async () => {
        try {
          const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(data.url || data.hdurl)}&w=1200&q=90&output=jpg`;
          const res = await fetch(proxyUrl);
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => setNasaBase64(reader.result);
          reader.readAsDataURL(blob);
        } catch (e) {
          console.error("NASA 이미지 변환 실패", e);
          setNasaBase64('error');
        }
      };
      fetchNasa();
    } else {
      setNasaBase64('video'); // 비디오인 경우 통과
    }

    // 2. 로고 변환
    const fetchLogo = async () => {
      try {
        const res = await fetch(logoDark);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("로고 변환 실패", e);
        setLogoBase64(logoDark); // 실패 시 원본 경로 폴백
      }
    };
    fetchLogo();
  }, [data]);

  if (!data) return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">데이터 로딩 실패</div>;

  const handlePrint = async () => {
    setIsPrinting(true); 
    if (isElectron()) {
      const targetPrinter = localStorage.getItem('target_printer_name') || ''; 
      await window.electron.ipcRenderer.invoke('print-silent', targetPrinter);
      setTimeout(() => { setIsPrinting(false); onHome(); }, 3000);
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
      padding: '60px 40px', // 상하 여백 60px 동일 유지
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }
  });

  const captureAndDownload = async (type) => {
    if (isCapturing) return;
    setIsCapturing(true);
    await new Promise(res => setTimeout(res, 300));

    try {
      const printArea = document.getElementById('print-area-wrapper');
      if (!printArea) throw new Error("캡처 영역 누락");

      if (type === 'share' || (type === 'download' && isMobile && navigator.share)) {
        const blob = await toBlob(printArea, getCaptureOptions());
        const file = new File([blob], `APOD_${data.date}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '포토카드 저장' });
        } else {
          throw new Error("공유 미지원");
        }
      } else {
        const dataUrl = await toPng(printArea, getCaptureOptions());
        const link = document.createElement('a');
        link.download = `APOD_${data.date}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      alert(`저장/공유 실패: ${error.message || error}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const isLandscape = orientation === 'landscape';
  // 이미지가 모두 Base64로 변환되었는지 확인하는 플래그
  const isReady = nasaBase64 && logoBase64; 

  return (
    <div className="w-screen min-h-[100dvh] bg-gray-900 text-white flex flex-col items-center p-4 md:p-8 overflow-y-auto overflow-x-hidden
                    print:bg-white print:w-full print:h-full print:p-0 print:m-0 print:block print:overflow-visible">
      
      <style>{`
        @media print {
          @page { size: ${paperSize} ${isLandscape ? 'landscape' : 'portrait'}; margin: 0mm; }
          #print-area-wrapper { width: 100%; height: 100%; display: flex !important; justify-content: center; align-items: center; }
        }
      `}</style>

      {/* 캡처 래퍼 */}
      <div id="print-area-wrapper" className="my-auto flex flex-col items-center justify-center bg-transparent mx-auto">
        <div className="bg-[#f9f9f7] shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:shadow-none border border-white/20 print:border-0
                        w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[35vw] xl:w-[28vw]
                        p-4 md:p-6 pb-12 md:pb-20 flex flex-col items-center">
          
          {/* 1. 이미지 영역 (<img> 태그 사용) */}
          <div className="w-full aspect-square bg-black overflow-hidden relative mb-6 md:mb-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
            {data.media_type === 'image' ? (
              nasaBase64 && nasaBase64 !== 'error' ? (
                <img src={nasaBase64} className="w-full h-full object-cover" alt="NASA APOD" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 animate-pulse">이미지 준비 중...</div>
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
                {data.copyright && <p className="truncate">ⓒ {data.copyright}</p>}
                <p className="font-bold text-gray-500">Powered by NASA APOD</p>
              </div>
            </div>

            <div className="flex flex-col items-center flex-shrink-0">
              {/* ★ QR 코드를 Canvas가 아닌 SVG로 렌더링 (iOS 캡처 100% 성공 보장) */}
              <QRCodeSVG 
                value={data.hdurl || data.url} 
                size={isMobile ? 64 : 100} 
                bgColor={"#f9f9f7"} 
                fgColor={"#111827"} 
                level={"M"} 
              />
              <span className="text-gray-900 text-[10px] md:text-xs font-black mt-2 mb-2 tracking-tighter uppercase">View Original</span>
              
              {/* 로고 영역 */}
              {logoBase64 ? (
                <img src={logoBase64} alt="With Light" className="h-5 md:h-7 mt-1 object-contain opacity-80 mix-blend-multiply" />
              ) : (
                <div className="h-5 md:h-7 mt-1 w-16 bg-gray-200 animate-pulse rounded"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {isCapturing ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse shadow-lg">처리 중...</div>
        ) : !isReady ? (
          <div className="px-6 py-3 bg-gray-600 rounded-xl font-bold text-white animate-pulse shadow-lg">카드 최적화 중...</div>
        ) : (
          <>
            <button onClick={onHome} className="px-4 md:px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition text-sm md:text-base shadow-lg">처음으로</button>
            {isElectron() && <button onClick={handlePrint} className="px-6 md:px-10 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg text-sm md:text-base">포토카드 출력</button>}
            {!isElectron() && (
              <>
                {!isMobile && <button onClick={handlePrint} className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 shadow-lg text-sm">인쇄/PDF</button>}
                <button onClick={() => captureAndDownload('download')} className="px-5 md:px-6 py-3 bg-green-600 rounded-xl font-bold hover:bg-green-500 shadow-lg flex items-center gap-2 text-sm">📥 저장</button>
                {isMobile && <button onClick={() => captureAndDownload('share')} className="px-5 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 shadow-lg flex items-center gap-2 text-sm">🚀 공유</button>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResultScreen;