import React, { useState, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import InputScreen from './components/InputScreen';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import AdminScreen from './components/AdminScreen'; // 새로 만든 컴포넌트 임포트
import { fetchApodData } from './utils/nasaApi';
import { isWeb } from './utils/env';

function App() {
  // 상태 목록: 'loading_check', 'auth'(웹), 'home', 'input', 'loading', 'result', 'admin_auth'(관리자비번), 'admin'(설정)
  const [screen, setScreen] = useState('loading_check');
  const [apodData, setApodData] = useState(null);
  const [password, setPassword] = useState('');

  // 앱이 켜지자마자 환경 체크
  useEffect(() => {
    if (isWeb()) {
      setScreen('auth'); // 웹이면 잠금 화면으로
    } else {
      setScreen('home'); // 앱이면 바로 홈으로
    }
  }, []);

  // 웹 접속용 비밀번호 체크 (0000)
  const checkWebAuth = () => {
    if (password === '0000') {
      setPassword('');
      setScreen('home');
    } else {
      alert('접속 코드가 틀렸습니다.');
      setPassword('');
    }
  };

  // 관리자 메뉴 진입용 비밀번호 체크 (1234)
  const checkAdminAuth = () => {
    if (password === '1234') { // ★ 관리자 비밀번호
      setPassword('');
      setScreen('admin'); // 관리자 화면으로
    } else {
      alert('관리자 비밀번호가 틀렸습니다.');
      setPassword('');
    }
  };

  // 핸들러들
  const handleStart = () => setScreen('input');
  
  // 홈에서 관리자 버튼 클릭 시
  const handleAdminClick = () => setScreen('admin_auth');

  const handleInputSubmit = async ({ year, month, day }) => {
    setScreen('loading');
    try {
      const data = await fetchApodData(year, month, day);
      console.log(data)
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

  // 0. 초기화 중 (깜빡임 방지용)
  if (screen === 'loading_check') return <div className="bg-black h-screen w-screen"></div>;

  return (
    <div className="antialiased font-sans select-none">
      
      {/* 1. 웹 전용 접속 잠금 화면 */}
      {screen === 'auth' && (
        <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white">
          <h2 className="text-2xl font-bold mb-6">🔒 APOD Kiosk Access</h2>
          <div className="flex gap-2">
            <input 
              type="password" 
              placeholder="Access Code"
              className="text-black p-3 rounded-lg text-center text-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkWebAuth()}
            />
            <button 
              onClick={checkWebAuth} 
              className="bg-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-500"
            >
              Enter
            </button>
          </div>
          <p className="mt-8 text-gray-500 text-sm">Authorized Personnel Only</p>
        </div>
      )}

      {/* 2. 관리자 비밀번호 입력 화면 */}
      {screen === 'admin_auth' && (
        <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center text-white relative">
          <button onClick={() => { setPassword(''); setScreen('home'); }} className="absolute top-8 right-8 text-gray-500 hover:text-white">닫기 ✕</button>
          <h2 className="text-3xl font-bold mb-8">⚙️ 관리자 모드 진입</h2>
          <p className="mb-4 text-gray-400">비밀번호를 입력하세요</p>
          <input 
            type="password" 
            className="text-black p-4 rounded-xl text-center text-2xl mb-6 w-64 outline-none focus:ring-4 focus:ring-blue-500"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && checkAdminAuth()}
          />
          <button onClick={checkAdminAuth} className="bg-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-500">확인</button>
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