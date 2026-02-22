import React, { useState, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import InputScreen from './components/InputScreen';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import AdminScreen from './components/AdminScreen'; 
import { fetchApodData } from './utils/nasaApi';
import { isWeb } from './utils/env';

function App() {
  const [screen, setScreen] = useState('loading_check');
  const [apodData, setApodData] = useState(null);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isWeb()) {
      setScreen('auth'); 
    } else {
      setScreen('home'); 
    }
  }, []);

  const checkWebAuth = () => {
    if (password === '0000') {
      setPassword('');
      setScreen('home');
    } else {
      alert('접속 코드가 틀렸습니다.');
      setPassword('');
    }
  };

  const checkAdminAuth = () => {
    if (password === '1234') { 
      setPassword('');
      setScreen('admin'); 
    } else {
      alert('관리자 비밀번호가 틀렸습니다.');
      setPassword('');
    }
  };

  const handleStart = () => setScreen('input');
  const handleAdminClick = () => setScreen('admin_auth');

  const handleInputSubmit = async ({ year, month, day }) => {
    setScreen('loading');
    try {
      const data = await fetchApodData(year, month, day);
      console.log(data);
      setApodData(data);
      setScreen('result');
    } catch (error) {
      console.error(error);
      alert("데이터를 가져오는데 실패했습니다.");
      setScreen('home');
    }
  };

  const handleHome = () => {
    setApodData(null);
    setScreen('home');
  };

  if (screen === 'loading_check') return <div className="bg-black h-screen w-screen"></div>;

  return (
    <div className="antialiased font-sans select-none">
      
      {/* 1. 웹 전용 접속 잠금 화면 (시인성 대폭 개선) */}
      {screen === 'auth' && (
        <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 tracking-wider text-center">🔒 APOD Kiosk Access</h2>
          <div className="flex flex-col md:flex-row gap-4 w-full max-w-sm">
            <input 
              type="password" 
              placeholder="Access Code (0000)"
              // ★ [수정] 배경을 돋보이게 하고, 굵은 테두리와 큰 폰트 적용
              className="w-full bg-white text-black p-4 rounded-xl text-center text-xl font-bold border-4 border-gray-600 focus:border-blue-500 outline-none shadow-2xl transition-all placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkWebAuth()}
            />
            <button 
              onClick={checkWebAuth} 
              className="w-full md:w-auto bg-blue-600 px-8 py-4 rounded-xl font-bold text-xl hover:bg-blue-500 shadow-lg active:scale-95 transition-transform"
            >
              Enter
            </button>
          </div>
          <p className="mt-12 text-gray-500 text-sm tracking-widest uppercase">Authorized Personnel Only</p>
        </div>
      )}

      {/* 2. 관리자 비밀번호 입력 화면 (시인성 대폭 개선) */}
      {screen === 'admin_auth' && (
        <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center text-white relative px-4">
          <button 
            onClick={() => { setPassword(''); setScreen('home'); }} 
            className="absolute top-8 right-8 text-gray-500 hover:text-white p-2 text-lg font-bold"
          >
            닫기 ✕
          </button>
          <div className="bg-gray-800 p-10 rounded-3xl shadow-2xl border border-gray-700 flex flex-col items-center w-full max-w-sm">
            <h2 className="text-3xl font-bold mb-6 text-center">⚙️ 관리자 모드</h2>
            <p className="mb-6 text-gray-400 text-center">설정에 진입하려면<br/>비밀번호를 입력하세요.</p>
            <input 
              type="password" 
              placeholder="비밀번호 (1234)"
              // ★ [수정] 배경, 굵은 테두리, 포커스 시 발광 효과 추가
              className="w-full bg-white text-black p-4 rounded-xl text-center text-2xl font-bold mb-6 border-4 border-gray-600 focus:border-blue-500 outline-none shadow-inner transition-all placeholder-gray-400"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkAdminAuth()}
            />
            <button 
              onClick={checkAdminAuth} 
              className="w-full bg-blue-600 py-4 rounded-xl font-bold text-xl hover:bg-blue-500 shadow-lg active:scale-95 transition-transform"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 3. 관리자 설정 화면 */}
      {screen === 'admin' && <AdminScreen onBack={() => setScreen('home')} />}

      {/* 4. 기존 메인 화면들 */}
      {screen === 'home' && <HomeScreen onStart={handleStart} onAdminClick={handleAdminClick} />}
      {screen === 'input' && <InputScreen onSubmit={handleInputSubmit} onBack={handleHome} />}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'result' && <ResultScreen data={apodData} onHome={handleHome} />}
    </div>
  );
}

export default App;