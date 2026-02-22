import React, { useState, useEffect } from 'react';
import { isElectron } from '../utils/env';

const AdminScreen = ({ onBack }) => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  
  // 용지 규격과 출력 방향 상태 관리
  const [selectedPaperSize, setSelectedPaperSize] = useState('auto');
  const [selectedOrientation, setSelectedOrientation] = useState('portrait');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 저장된 설정 불러오기
    const savedPrinter = localStorage.getItem('target_printer_name');
    if (savedPrinter) setSelectedPrinter(savedPrinter);

    const savedPaperSize = localStorage.getItem('target_paper_size');
    if (savedPaperSize) setSelectedPaperSize(savedPaperSize);

    const savedOrientation = localStorage.getItem('target_orientation');
    if (savedOrientation) setSelectedOrientation(savedOrientation);

    // 프린터 목록 가져오기 (Electron 전용)
    if (isElectron()) {
      setLoading(true);
      window.electron.ipcRenderer.invoke('get-printers')
        .then((list) => {
          setPrinters(list);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, []);

  // 저장 핸들러
  const handleSave = () => {
    localStorage.setItem('target_printer_name', selectedPrinter);
    localStorage.setItem('target_paper_size', selectedPaperSize);
    localStorage.setItem('target_orientation', selectedOrientation);
    
    alert(`설정이 저장되었습니다.\n- 프린터: ${selectedPrinter || '기본 프린터'}\n- 용지: ${selectedPaperSize}\n- 방향: ${selectedOrientation === 'landscape' ? '가로' : '세로'}`);
  };

  const paperOptions = [
    { label: '기본 설정 (프린터 설정 따름)', value: 'auto' },
    { label: '4x6 포토 인화지', value: '4in 6in' },
    { label: 'A4 용지 (세로 기준)', value: 'A4' },
    { label: '80mm 영수증 롤지', value: '80mm auto' }
  ];

  const orientationOptions = [
    { label: '세로 출력 (Portrait)', value: 'portrait' },
    { label: '가로 출력 (Landscape)', value: 'landscape' }
  ];

  return (
    <div className="w-screen h-screen bg-gray-800 text-white flex flex-col items-center justify-center p-8 overflow-y-auto">
      <h2 className="text-3xl font-bold mb-8">⚙️ 관리자 설정</h2>

      <div className="bg-gray-700 p-8 rounded-2xl w-full max-w-2xl shadow-xl space-y-8">
        
        {/* 1. 프린터 설정 영역 */}
        <div>
          <h3 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">🖨️ 프린터 설정</h3>
          {!isElectron() ? (
            <div className="text-yellow-400 p-4 bg-yellow-400/10 rounded-lg">
              ⚠️ 웹 브라우저 모드입니다.<br/>
              인쇄 시 대화상자에서 프린터를 선택해주세요.
            </div>
          ) : (
            <div>
              <p className="mb-4 text-gray-300">사용할 프린터를 선택하세요:</p>
              {loading ? (
                <p>프린터 목록을 불러오는 중...</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  <label className="flex items-center space-x-3 p-3 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-500 transition border border-transparent hover:border-blue-400">
                    <input type="radio" value="" checked={selectedPrinter === ''} onChange={(e) => setSelectedPrinter(e.target.value)} className="w-5 h-5 text-blue-600"/>
                    <span>시스템 기본 프린터 (Default)</span>
                  </label>
                  {printers.map((p) => (
                    <label key={p.name} className="flex items-center space-x-3 p-3 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-500 transition border border-transparent hover:border-blue-400">
                      <input type="radio" value={p.name} checked={selectedPrinter === p.name} onChange={(e) => setSelectedPrinter(e.target.value)} className="w-5 h-5 text-blue-600"/>
                      <div className="flex flex-col">
                        <span className="font-bold">{p.name}</span>
                        <span className="text-xs text-gray-400">{p.displayName}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. 용지 규격 및 출력 방향 설정 영역 (나란히 배치) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* 용지 규격 */}
          <div>
            <h3 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">📄 용지 규격</h3>
            <div className="space-y-2">
              {paperOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-3 p-3 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-500 transition border border-transparent hover:border-green-400">
                  <input type="radio" value={option.value} checked={selectedPaperSize === option.value} onChange={(e) => setSelectedPaperSize(e.target.value)} className="w-5 h-5 text-green-600"/>
                  <span className="font-medium text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* 출력 방향 */}
          <div>
            <h3 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">🔄 출력 방향</h3>
            <div className="space-y-2">
              {orientationOptions.map((option) => (
                <label key={option.value} className="flex items-center space-x-3 p-3 bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-500 transition border border-transparent hover:border-yellow-400">
                  <input type="radio" value={option.value} checked={selectedOrientation === option.value} onChange={(e) => setSelectedOrientation(e.target.value)} className="w-5 h-5 text-yellow-600"/>
                  <span className="font-medium text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* 3. 하단 버튼 영역 */}
        <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-gray-600">
          <button onClick={onBack} className="px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-500 transition">뒤로가기</button>
          <button onClick={handleSave} className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold shadow-lg transition">저장하기</button>
        </div>
      </div>
    </div>
  );
};

export default AdminScreen;