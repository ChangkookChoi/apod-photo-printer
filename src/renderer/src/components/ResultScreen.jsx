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
  const [isCapturing, setIsCapturing] = useState(false); // 기본값을 false로 변경하여 화면 멈춤 방지
  
  const qrRef = useRef(null);
  const [qrImageData, setQrImageData] = useState(null);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || (isElectron() ? 'auto' : 'A4'));
    setOrientation(localStorage.getItem('target_orientation') || 'portrait');
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const timer = setTimeout(() => onHome(), 60000);
    return () => clearTimeout(timer);
  }, [onHome]);

  // QR 코드가 생성되면 iOS 캡처용 이미지로 변환
  useEffect(() => {
    const timer = setTimeout(() => {
      if (qrRef.current) {
        const canvas = qrRef.current.querySelector('canvas');
        if (canvas) setQrImageData(canvas.toDataURL());
      }
    }, 1000); // QR 생성 대기
    return () => clearTimeout(timer);
  }, [data]);

  if (!data) return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">데이터를 불러올 수 없습니다.</div>;

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
    style: {
      margin: '0',
      padding: '60px 40px', // 상하 60px 대칭 여백 유지
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }
  });

  const handleCapture = async (type) => {
    setIsCapturing(true);
    await new Promise(res => setTimeout(res, 500));

    try {
      const printArea = document.getElementById('print-area-wrapper');
      if (type === 'download') {
        if (isMobile && navigator.share) {
          const blob = await toBlob(printArea, getCaptureOptions());
          const file = new File([blob], `APOD_${data.date}.png`, { type: 'image/png' });
          await navigator.share({ files: [file], title: '포토카드 저장' });
        } else {
          const dataUrl = await toPng(printArea, getCaptureOptions());
          const link = document.createElement('a');
          link.download = `APOD_${data.date}.png`;
          link.href = dataUrl;
          link.click();
        }
      } else {
        const blob = await toBlob(printArea, getCaptureOptions());
        const file = new File([blob], `APOD_${data.date}.png`, { type: 'image/png' });
        await navigator.share({ files: [file] });
      }
    } catch (e) {
      alert("이미지 생성 중 오류가 발생했습니다.");
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

      {/* 캡처 래퍼 (상하 여백 보장) */}
      <div id="print-area-wrapper" className="my-auto flex flex-col items-center justify-center bg-transparent mx-auto">
        <div className="bg-[#f9f9f7] shadow-2xl border border-white/10 print:border-0
                        w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[35vw] xl:w-[28vw]
                        p-4 md:p-6 pb-12 md:pb-20 flex flex-col items-center">
          
          {/* 1. 이미지 영역 */}
          <div className="w-full aspect-square bg-black overflow-hidden relative mb-6 md:mb-10 shadow-inner">
            <img 
              src={`https://wsrv.nl/?url=${encodeURIComponent(data.url || data.hdurl)}&w=1200&q=90&output=jpg`}
              className="w-full h-full object-cover"
              alt="NASA"
              crossOrigin="anonymous"
            />
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
                <p className="font-bold text-gray-400">Powered by NASA APOD</p>
              </div>
            </div>

            <div className="flex flex-col items-center flex-shrink-0">
              {/* QR 코드 영역 (화면 표시/숨김 처리로 안정성 확보) */}
              <div ref={qrRef} className={qrImageData ? 'hidden' : 'block'}>
                <QRCodeCanvas value={data.hdurl || data.url} size={isMobile ? 64 : 100} bgColor={"#f9f9f7"} fgColor={"#111827"} level={"M"} />
              </div>
              {qrImageData && <img src={qrImageData} width={isMobile ? 64 : 100} alt="QR" />}
              
              <span className="text-gray-900 text-[10px] md:text-xs font-black mt-2 mb-2 tracking-tighter uppercase">View Original</span>
              <img src={logoDark} alt="With Light" className="h-5 md:h-7 mt-1 object-contain opacity-80" />
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {!isCapturing ? (
          <>
            <button onClick={onHome} className="px-4 md:px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition text-sm shadow-lg">처음으로</button>
            {isElectron() && <button onClick={handlePrint} className="px-6 md:px-10 py-3 bg-blue-600 rounded-xl font-bold shadow-lg">출력하기</button>}
            <button onClick={() => handleCapture('download')} className="px-5 md:px-6 py-3 bg-green-600 rounded-xl font-bold shadow-lg flex items-center gap-2">📥 저장</button>
            {isMobile && <button onClick={() => handleCapture('share')} className="px-5 py-3 bg-indigo-600 rounded-xl font-bold shadow-lg flex items-center gap-2">🚀 공유</button>}
          </>
        ) : (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse">이미지 생성 중...</div>
        )}
      </div>
    </div>
  );
};

export default ResultScreen;