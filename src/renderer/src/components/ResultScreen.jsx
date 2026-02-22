import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng, toBlob } from 'html-to-image'; // ★ [변경] html-to-image 엔진으로 교체!
import { isElectron } from '../utils/env';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(true); 
  const [localImageUrl, setLocalImageUrl] = useState(null);

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
    
    const rawUrl = data.url || data.hdurl;
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&w=1200&q=90&output=jpg`;

    setIsCapturing(true); 

    fetch(proxyUrl)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return response.blob();
      })
      .then(blob => {
        const localUrl = URL.createObjectURL(blob);
        setLocalImageUrl(localUrl);
        setIsCapturing(false); 
      })
      .catch(err => {
        console.error("이미지 로컬 프리로딩 실패:", err);
        setLocalImageUrl(proxyUrl);
        setIsCapturing(false);
      });

    return () => {
      if (localImageUrl) {
        URL.revokeObjectURL(localImageUrl);
      }
    };
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

  // ★ [추가] html-to-image 공통 옵션 (해상도 등)
  const getCaptureOptions = () => ({
    backgroundColor: '#ffffff',
    pixelRatio: isMobile ? 1 : 2,
    style: {
      margin: '0',
      padding: '4mm'
    }
  });

  const handleDownloadImage = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    
    // UI 업데이트 시간을 벌기 위한 약간의 딜레이
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const printArea = document.getElementById('print-area');
      if (!printArea) throw new Error("캡처할 영역을 찾을 수 없습니다.");

      // ★ [변경] toPng를 이용해 한 번에 Base64 이미지로 굽기
      const dataUrl = await toPng(printArea, getCaptureOptions());
      
      const link = document.createElement('a');
      link.download = `APOD_Photocard_${data.date}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('이미지 저장 에러:', error);
      alert(`[오류 상세] 저장 실패\n${error.message || error}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShare = async () => {
    if (isCapturing) return;
    
    if (!navigator.canShare) {
      alert('현재 브라우저에서는 공유 기능을 지원하지 않습니다.\n(웹사이트 링크만 복사됩니다.)');
      try {
        await navigator.share({ title: '우주에서 온 내 생일 사진', url: window.location.href });
      } catch(e) {}
      return;
    }

    setIsCapturing(true);
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      const printArea = document.getElementById('print-area');
      if (!printArea) throw new Error("캡처할 영역을 찾을 수 없습니다.");

      // ★ [변경] toBlob을 이용해 파일 형태로 바로 뽑아내기
      const blob = await toBlob(printArea, getCaptureOptions());
      if (!blob) throw new Error("이미지 파일(Blob) 생성에 실패했습니다.");
      
      const file = new File([blob], `APOD_Photocard_${data.date}.png`, { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        throw new Error("브라우저가 파일 직접 공유를 허용하지 않습니다.");
      }
    } catch (error) {
      console.error('공유 에러:', error);
      alert(`[오류 상세] 공유 실패\n${error.message || error}`);
      try {
         await navigator.share({ title: '우주에서 온 내 생일 사진', url: window.location.href });
      } catch (e) {}
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
            flex-direction: ${isLandscape ? 'row' : 'column'} !important; 
            justify-content: center; align-items: center; padding: 4mm;
            ${paperSize.includes('A4') && !isElectron() ? `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%;` : ''}
          }
        }
      `}</style>

      <div id="print-area" className={`my-auto w-full flex items-center print:text-black bg-gray-900 print:bg-white p-4 rounded-xl
            ${isLandscape ? 'max-w-5xl flex-col md:flex-row gap-4 md:gap-8' : 'max-w-4xl flex-col gap-4'}`}>
        
        <div className={`relative flex items-center justify-center bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-700 
                        print:border-0 print:rounded-none print:shadow-none print:bg-white
                        ${isLandscape ? 'w-full md:w-[65%] mb-0' : 'w-full mb-2 print:mb-4'}`}>
          {data.media_type === 'image' ? (
            <img 
              src={localImageUrl} 
              alt={data.title} 
              crossOrigin="anonymous" 
              className={`max-w-full object-contain print:object-contain transition-opacity duration-500
              ${isLandscape ? 'max-h-[50vh] md:max-h-[80vh] print:max-h-[90vh]' : 'max-h-[50vh] md:max-h-[60vh] print:max-h-[65vh]'}
              ${localImageUrl ? 'opacity-100' : 'opacity-0'}`} 
            />
          ) : (
            <div className="text-center p-10 flex flex-col items-center justify-center h-full print:text-black min-h-[300px]">
              <p className="text-4xl mb-4">🎥</p>
              <p className="text-xl">동영상 콘텐츠입니다.</p>
            </div>
          )}
        </div>

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

      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-6 mb-8 print:hidden z-50">
        {isPrinting || isCapturing ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white animate-pulse text-sm md:text-base flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isCapturing ? '이미지 생성 중...' : '출력 처리 중...'}
          </div>
        ) : (
          <>
            <button onClick={onHome} className="px-4 md:px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition text-sm md:text-base">
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