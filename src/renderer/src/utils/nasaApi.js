import axios from 'axios';

// 여기에 발급받으신 여러 개의 API 키를 넣어주세요.
const API_KEYS = [
  'g5uadgJR7FIslRVFcfqKpsVXHmmT02eexHiPtwst', //CK
  '5PzSRMhe3xssM9yJLayguafLE5yH8yfCuh03HBfE', //CD        
];

const BASE_URL = 'https://api.nasa.gov/planetary/apod';

export const fetchApodData = async (year, month, day) => {
  let targetYear = parseInt(year);
  const targetMonth = month.padStart(2, '0');
  const targetDay = day.padStart(2, '0');

  const inputDate = new Date(`${targetYear}-${targetMonth}-${targetDay}`);
  const serviceStartDate = new Date('1995-06-16');
  const currentYear = new Date().getFullYear();
  const minYear = 1996;
  const maxYear = currentYear - 1;

  if (inputDate < serviceStartDate) {
    console.log("⚠️ 1995년 이전 날짜 감지! 연도를 랜덤으로 변경합니다.");
    targetYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
  }

  let isImageFound = false;
  let finalData = null;
  let currentSearchYear = targetYear;
  let retryCount = 0;
  const MAX_RETRIES = 10;

  // ★ [추가] 이번 탐색에서 사용할 수 있는 '살아있는 키' 목록 복사본
  let availableKeys = [...API_KEYS];

  // 전체 try-catch 대신 while 문 안에서 개별 요청마다 에러를 잡도록 변경
  while (!isImageFound && retryCount < MAX_RETRIES) {
    // 1. 만약 준비한 모든 키가 다 할당량 초과로 죽었다면?
    if (availableKeys.length === 0) {
      throw new Error("🚨 준비된 모든 API 키의 일일 할당량이 초과되었습니다!");
    }

    const formattedDate = `${currentSearchYear}-${targetMonth}-${targetDay}`;
    
    // 2. 살아있는 키 목록 중에서 무작위로 하나 뽑기
    const randomIndex = Math.floor(Math.random() * availableKeys.length);
    const currentKey = availableKeys[randomIndex];

    console.log(`🚀 API 요청 날짜: ${formattedDate} | 🔑 시도하는 키: ${currentKey.substring(0, 5)}...`);

    try {
      const response = await axios.get(BASE_URL, {
        params: {
          api_key: currentKey,
          date: formattedDate,
          hd: true, 
        },
      });
      
      // 요청 성공 시 동영상/이미지 판별
      if (response.data.media_type === 'image') {
        isImageFound = true;
        finalData = response.data;
      } else {
        console.log(`🎥 ${formattedDate} 데이터는 동영상입니다. 다른 연도를 랜덤 탐색합니다.`);
        currentSearchYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
        retryCount++;
      }

    } catch (error) {
      // ★ [핵심] 에러 핸들링: NASA API에서 할당량 초과(429) 에러가 났을 때
      if (error.response && error.response.status === 429) {
        console.warn(`⚠️ 키 할당량 초과 감지! 해당 키(${currentKey.substring(0, 5)}...)를 버리고 다른 키로 재시도합니다.`);
        // 살아있는 키 목록에서 이 키를 삭제함
        availableKeys.splice(randomIndex, 1);
        // retryCount는 증가시키지 않고 continue를 써서 루프를 바로 다시 돔
        continue;
      } else {
        // 429 할당량 에러가 아닌, 아예 인터넷이 끊겼거나 하는 진짜 에러일 경우
        console.error("API Error:", error);
        throw error;
      }
    }
  }
  
  if (!finalData) {
    throw new Error("이미지 데이터를 찾지 못했습니다.");
  }
  
  return finalData; 
};