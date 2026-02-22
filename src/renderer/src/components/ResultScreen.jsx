import React, { useEffect, useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { toBlob } from 'html-to-image';
import { isElectron } from '../utils/env';
import logoDark from '../assets/logo_dark.png';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(true); 
  
  // 모든 요소를 Base64로 미리 변환하여 관리
  const [base64Image, setBase64Image] = useState(null);
  const [base64QR, setBase64QR] = useState(null);
  const [base64Logo, setBase64Logo] = useState(null);
  const qrRef = useRef(null);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || (isElectron() ? 'auto' : 'A4'));
    const savedOrientation = localStorage.getItem('target_orientation');
    setOrientation(savedOrientation || 'portrait');
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    // 자동 복귀 타이머
    const timer = setTimeout(() => onHome(), 60000);
    return () => clearTimeout(timer);
  }, [onHome]);

  // ★ 리소스 Base64 변환 로직
  useEffect(() => {
    if (!data || data.media_type !== 'image') { setIsCapturing(false); return; }
    
    setIsCapturing(true);

    // 1. NASA 이미지 변환
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(data.url || data.hdurl)}&w=1200&q=90&output=jpg`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      setBase64Image(canvas.toDataURL('image/jpeg'));
    };
    img.src = proxyUrl;

    // 2. 로고 이미지 변환
    fetch(logoDark).then(res => res.blob()).then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => setBase64Logo(reader.result);
      reader.readAsDataURL(blob);
    });
  }, [data]);

  // QR 코드가 그려지면 Base64로 추출
  useEffect(() => {
    if (imgLoaded && qrRef.current) {
      const qrCanvas = qrRef.current.querySelector('canvas');
      if (qrCanvas) setBase64QR(qrCanvas.toDataURL());
    }
  }, [imgLoaded]);

  const imgLoaded = !!base64Image && !!base64Logo;
  useEffect(() => { if (imgLoaded) setIsCapturing(false); }, [imgLoaded]);

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

  const captureCard = async () => {
    const printArea = document.getElementById('print-area-wrapper');
    const options = {
      backgroundColor: '#111827',
      pixelRatio: 2,
      style: {
        margin: '0',
        padding: '60px 40px', // ★ 상하 여백 60px로 완벽 대칭
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }
    };
    return await toBlob(printArea, options);
  };

  const handleDownloadImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    await new Promise(res => setTimeout(res, 500)); // iOS 렌더링 동기화 대기

    try {
      const blob = await captureCard();
      if (isMobile && navigator.share) {
        const file = new File([blob], `APOD_${data.date}.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: '포토카드 저장' });
      } else {
        const link = document.createElement('a');
        link.download = `APOD_${data.date}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    } catch (e) {
      alert("이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShare = async () => {
    if (isCapturing || !navigator.share) return;
    setIsCapturing(true);
    await new Promise(res => setTimeout(res, 500));

    try {
      const blob = await captureCard();
      const file = new File([blob], `APOD_${data.date}.png`, { type: 'image/png' });
      await navigator.share({ files: [file] });
    } catch (e) {
      alert("공유에 실패했습니다.");
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
          #print-area-wrapper { width: 100%; height: 100%; display: flex !important; justify-content: center; align-items: center; }
        }
      `}</style>

      {/* 캡처를 위한 최상위 래퍼 (상하 여백 포함) */}
      <div id="print-area-wrapper" className="my-auto flex flex-col items-center justify-center bg-transparent mx-auto">
        <div 
          className="bg-[#f9f9f7] shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:shadow-none border border-white/20 print:border-0
                        w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[35vw] xl:w-[28vw]
                        p-4 md:p-6 pb-12 md:pb-20 flex flex-col items-center"
        >
          {/* 1. 이미지 영역 (캔버스 대신 안정적인 img 태그 사용) */}
          <div className="w-full aspect-square bg-black overflow-hidden relative mb-6 md:mb-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
            {base64Image ? (
              <img src={base64Image} className="w-full h-full object-cover" alt="NASA" />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 animate-pulse text-sm">LOADING IMAGE...</div>
            )}
          </div>

          {/* 2. 하단 정보 영역 */}
          <div className="w-full flex justify-between items-end px-1 gap-6">
            <div className="flex flex-col flex-1 min-w-0 text-left text-gray-900"> 
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold break-keep leading-tight mb-2 tracking-tighter">
                {data.title}
              </h2>
              <p className="text-gray-500 text-base md:text-lg lg:text-xl font-semibold mb-4 italic">
                {data.date}
              </p>
              <div className="text-[10px] md:text-xs lg:text-sm text-gray-400 font-medium leading-snug uppercase tracking-widest">
                {data.copyright && <p className="truncate">ⓒ {data.copyright}</p>}
                <p className="font-bold">Powered by NASA APOD</p>
              </div>
            </div>

            <div className="flex flex-col items-center flex-shrink-0">
              {/* 화면 표시용 QR (실제 렌더링됨) */}
              <div ref={qrRef} className={base64QR ? 'hidden' : 'block'}>
                <QRCodeCanvas value={data.hdurl || data.url} size={isMobile ? 64 : 100} bgColor={"#f9f9f7"} fgColor={"#111827"} level={"M"} />
              </div>
              {/* 캡처용 QR 이미지 (iOS 대응 핵심) */}
              {base64QR && <img src={base64QR} width={isMobile ? 64 : 100} alt="QR" />}
              
              <span className="text-gray-900 text-[10px] md:text-xs font-black mt-2 mb-2 tracking-tighter uppercase">View Original</span>
              
              {base64Logo && <img src={base64Logo} alt="Logo" className="h-5 md:h-7 mt-1 object-contain opacity-90" />}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {!isCapturing ? (
          <>
            <button onClick={onHome} className="px-4 md:px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition text-sm md:text-base shadow-lg">처음으로</button>
            {isElectron() && <button onClick={handlePrint} className="px-6 md:px-10 py-3 bg-blue-600 rounded-xl font-bold shadow-lg">출력하기</button>}
            <button onClick={handleDownloadImage} className="px-5 md:px-6 py-3 bg-green-600 rounded-xl font-bold shadow-lg flex items-center gap-2">📥 저장</button>
            {isMobile && <button onClick={handleShare} className="px-5 py-3 bg-indigo-600 rounded-xl font-bold shadow-lg flex items-center gap-2">🚀 공유</button>}
          </>
        ) : (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse">이미지 최적화 중...</div>
        )}
      </div>
    </div>
  );
};

export default ResultScreen;