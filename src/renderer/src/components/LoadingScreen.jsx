import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-blue-500 mb-8"></div>
      <h2 className="text-2xl font-bold animate-pulse">
        우주에서 사진을 가져오는 중... 🛰️
      </h2>
      <p className="text-gray-400 mt-4">NASA 서버와 통신하고 있습니다.</p>
    </div>
  );
};

export default LoadingScreen;