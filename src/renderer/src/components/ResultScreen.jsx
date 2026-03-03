import React, { useEffect, useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'; 
import { toPng, toBlob } from 'html-to-image';
import { isElectron } from '../utils/env';

const ResultScreen = ({ data, onHome }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperSize, setPaperSize] = useState('auto');
  const [orientation, setOrientation] = useState('portrait');
  const [isMobile, setIsMobile] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); 
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const savedPaperSize = localStorage.getItem('target_paper_size');
    setPaperSize(savedPaperSize || 'auto');
    setOrientation(localStorage.getItem('target_orientation') || 'portrait');
    
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileCheck = /iPhone|iPad|iPod|Android/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsMobile(mobileCheck);

    const timer = setTimeout(() => onHome(), 60000);
    return () => clearTimeout(timer);
  }, [onHome]);

  if (!data) return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">데이터 로딩 실패</div>;

  const proxyUrl = data.media_type === 'image' 
    ? `https://wsrv.nl/?url=${encodeURIComponent(data.url || data.hdurl)}&w=1200&q=90&output=jpg` 
    : '';

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
      padding: '60px 40px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    filter: (node) => {
      const tag = node.tagName?.toLowerCase();
      if (tag === 'link' || tag === 'style' || tag === 'script') return false;
      return true;
    }
  });

  const generateMobileCanvasBlob = async () => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const padding = 120; 
      const cardW = 960;
      const cardH = 1280;
      
      canvas.width = cardW + (padding * 2);
      canvas.height = cardH + (padding * 2);

      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cardX = padding;
      const cardY = padding;
      ctx.fillStyle = '#f9f9f7';
      ctx.fillRect(cardX, cardY, cardW, cardH);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const imgSize = 840; 
        const imgX = cardX + 60;
        const imgY = cardY + 60;

        const scale = Math.max(imgSize / img.width, imgSize / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = imgX + (imgSize - drawW) / 2;
        const drawY = imgY + (imgSize - drawH) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(imgX, imgY, imgSize, imgSize);
        ctx.clip(); 
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        const textX = imgX;
        let textY = imgY + imgSize + 60;

        ctx.fillStyle = '#111827';
        ctx.font = 'bold 36px sans-serif';
        const titleText = data.title.length > 35 ? data.title.substring(0, 35) + '...' : data.title;
        ctx.fillText(titleText, textX, textY);
        
        textY += 45;
        ctx.fillStyle = '#6b7280';
        ctx.font = 'italic 24px sans-serif';
        ctx.fillText(data.date, textX, textY);

        textY += 40;
        ctx.fillStyle = '#9ca3af';
        ctx.font = 'bold 18px sans-serif';
        if (data.copyright) {
          ctx.fillText(`ⓒ ${data.copyright}`.substring(0, 40), textX, textY);
          textY += 25;
        }
        ctx.fillText('POWERED BY NASA APOD', textX, textY);

        const qrCanvas = document.getElementById('hidden-qr-canvas');
        if (qrCanvas) {
          const qrSize = 130;
          const qrX = cardX + cardW - 60 - qrSize;
          const qrY = imgY + imgSize + 25;
          ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
          
          ctx.fillStyle = '#111827';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VIEW ORIGINAL', qrX + (qrSize / 2), qrY + qrSize + 25);
        }

        canvas.toBlob((blob) => resolve(blob), 'image/png');
      };
      img.onerror = () => reject(new Error('이미지 렌더링을 실패했습니다.'));
      img.src = proxyUrl;
    });
  };

  const handleCapture = async (type) => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      let blob;

      if (isMobile) {
        blob = await generateMobileCanvasBlob();
      } else {
        const printArea = document.getElementById('print-area-wrapper');
        blob = await toBlob(printArea, getCaptureOptions());
      }

      if (!blob) throw new Error("이미지 생성에 실패했습니다.");

      if (type === 'share' || (type === 'download' && isMobile && navigator.share)) {
        const file = new File([blob], `APOD_Photocard_${data.date}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '우주에서 온 포토카드' });
        } else {
          throw new Error("공유 기능을 지원하지 않는 기기입니다.");
        }
      } else {
        const dataUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `APOD_Photocard_${data.date}.png`;
        link.href = dataUrl;
        link.click();
        URL.revokeObjectURL(dataUrl);
      }
    } catch (error) {
      alert(`[오류 발생]\n${error.message || error}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const isLandscape = orientation === 'landscape';
  const is4x6Mode = paperSize === '4in 6in' || paperSize === 'auto';

  return (
    <div className="w-screen min-h-[100dvh] bg-gray-900 text-white flex flex-col items-center p-4 md:p-8 overflow-y-auto overflow-x-hidden
                    print:bg-white print:w-full print:h-full print:p-0 print:m-0 print:block print:overflow-visible">
      
      <style>{`
        @media print {
          @page { size: ${paperSize === 'auto' ? 'auto' : paperSize} ${isLandscape ? 'landscape' : 'portrait'}; margin: 0mm; }
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: white; -webkit-print-color-adjust: exact; }
          
          .photo-card-container {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          #print-area-wrapper { 
            width: 100% !important; 
            height: 100% !important; 
            display: flex !important; 
            justify-content: center; 
            align-items: center; 
            margin: 0 !important;
            padding: 0 !important;
          }

          #print-area-wrapper.strict-4x6-wrapper {
            display: block !important;
            height: 100vh !important;
            padding: 0 !important; 
            margin: 0 !important;
          }
          
          /* ★ 수정됨: 비율 교정 (웹 화면과 동일한 폴라로이드 패딩 밸런스) */
          .strict-4x6-mode {
            width: 4in !important;
            height: 6in !important;
            max-width: 100vw !important; 
            max-height: 100vh !important;
            margin: 0 auto !important; 
            /* 폴라로이드 감성: 상, 좌, 우는 0.2인치, 하단은 0.4인치로 세팅 */
            padding: 0.2in 0.2in 0.4in 0.2in !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* ★ 수정됨: 너비를 100%로 풀어서 아래 텍스트 영역과 폭을 완벽하게 맞춤 */
          .strict-4x6-mode .photo-image-area {
            width: 100% !important; 
            height: 3.6in !important; /* 4인치 - (좌우 0.2 + 0.2) = 정확히 3.6인치 정사각형 */
            margin-bottom: 0.2in !important;
          }

          .strict-4x6-mode .photo-info-area {
            flex: 1 !important;
            width: 100% !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-end !important;
            padding: 0 0.05in !important; /* 좌우 미세 정렬 (px-1 효과) */
            box-sizing: border-box !important;
          }
          
          /* 폰트 및 요소 크기를 웹 비율에 맞춰 튜닝 */
          .strict-4x6-mode .print-text-title { font-size: 15pt !important; line-height: 1.1 !important; margin-bottom: 2mm !important; white-space: normal !important; letter-spacing: -0.5px !important; }
          .strict-4x6-mode .print-text-date { font-size: 11pt !important; margin-bottom: 3mm !important; }
          .strict-4x6-mode .print-text-copy { font-size: 7.5pt !important; line-height: 1.2 !important; }
          .strict-4x6-mode .print-text-copy p { margin: 0 !important; }
          .strict-4x6-mode .print-qr-area svg { width: 0.7in !important; height: 0.7in !important; }
          .strict-4x6-mode .print-qr-text { font-size: 6.5pt !important; margin-top: 2mm !important; }
        }
      `}</style>

      <div className="hidden">
        <QRCodeCanvas id="hidden-qr-canvas" value={data.hdurl || data.url} size={250} bgColor={"#ffffff"} fgColor={"#000000"} level={"M"} />
      </div>

      <div id="print-area-wrapper" className={`my-auto flex flex-col items-center justify-center bg-transparent mx-auto ${is4x6Mode ? 'strict-4x6-wrapper' : ''}`}>
        <div className={`photo-card-container bg-[#f9f9f7] print:bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:shadow-none border border-white/20 print:border-0
                        w-[85vw] sm:w-[65vw] md:w-[50vw] lg:w-[35vw] xl:w-[28vw]
                        p-4 md:p-6 pb-12 md:pb-20 flex flex-col items-center ${is4x6Mode ? 'strict-4x6-mode' : ''}`}>
          
          <div className="photo-image-area w-full aspect-square bg-black print:bg-transparent overflow-hidden relative mb-6 md:mb-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] print:shadow-none">
            {data.media_type === 'image' ? (
              <>
                {!imgLoaded && <div className="absolute inset-0 flex items-center justify-center text-gray-500 animate-pulse text-sm">사진 인화 중...</div>}
                <img 
                  src={proxyUrl} 
                  crossOrigin="anonymous" 
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`} 
                  alt="NASA APOD" 
                />
              </>
            ) : (
              <div className="text-center p-10 flex flex-col items-center justify-center h-full text-black">
                <p className="text-5xl mb-4 text-white print:text-black">🎥</p>
                <p className="text-xl font-bold text-white print:text-black">Video Content</p>
              </div>
            )}
          </div>

          <div className="photo-info-area w-full flex justify-between items-end px-1 gap-6 text-gray-900 print:text-black">
            <div className="flex flex-col flex-1 min-w-0 text-left"> 
              <h2 className="print-text-title text-2xl md:text-3xl lg:text-4xl font-bold break-keep leading-tight mb-2 tracking-tighter">
                {data.title}
              </h2>
              <p className="print-text-date text-gray-500 print:text-gray-700 text-base md:text-lg lg:text-xl font-semibold mb-4 italic">
                {data.date}
              </p>
              <div className="print-text-copy text-[10px] md:text-xs lg:text-sm text-gray-400 print:text-gray-600 font-medium leading-snug uppercase tracking-widest">
                {data.copyright && <p className="truncate text-left">ⓒ {data.copyright}</p>}
                <p className="text-left font-bold text-gray-500 print:text-gray-800">Powered by NASA APOD</p>
              </div>
            </div>

            <div className="print-qr-area flex flex-col items-center flex-shrink-0">
              <QRCodeSVG 
                value={data.hdurl || data.url} 
                size={isMobile ? 64 : 100} 
                bgColor={"#ffffff"} 
                fgColor={"#000000"} 
                level={"M"} 
              />
              <span className="print-qr-text text-gray-900 print:text-black text-[10px] md:text-xs font-black mt-2 mb-2 tracking-tighter uppercase">View Original</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 mb-8 print:hidden z-50">
        {isCapturing ? (
          <div className="px-6 py-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg animate-pulse">
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
                  <>
                    <button onClick={handlePrint} className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 shadow-lg text-sm md:text-base">
                      인쇄 / PDF
                    </button>
                    <button onClick={() => handleCapture('download')} className="px-5 md:px-6 py-3 bg-green-600 rounded-xl font-bold hover:bg-green-500 shadow-lg flex items-center gap-2 text-sm md:text-base">
                      <span>📥</span> 저장
                    </button>
                  </>
                )}
                
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