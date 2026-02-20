import axios from 'axios';

const API_KEY = 'g5uadgJR7FIslRVFcfqKpsVXHmmT02eexHiPtwst'; // 나중에 발급받은 실제 키로 교체 필요
const BASE_URL = 'https://api.nasa.gov/planetary/apod';

export const fetchApodData = async (year, month, day) => {
  let targetYear = parseInt(year);
  const targetMonth = month.padStart(2, '0');
  const targetDay = day.padStart(2, '0');

  // [로직] 1995년 6월 16일 이전인지 체크
  const inputDate = new Date(`${targetYear}-${targetMonth}-${targetDay}`);
  const serviceStartDate = new Date('1995-06-16');
  const currentYear = new Date().getFullYear();
  const minYear = 1996;
  const maxYear = currentYear - 1;

  if (inputDate < serviceStartDate) {
    console.log("⚠️ 1995년 이전 날짜 감지! 연도를 랜덤으로 변경합니다.");
    targetYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
  }

  // ★ [수정] 동영상일 경우 이미지를 찾을 때까지 재호출하는 로직 추가
  let isImageFound = false;
  let finalData = null;
  let currentSearchYear = targetYear;
  let retryCount = 0;
  const MAX_RETRIES = 10; // 무한 루프 방지용 안전장치 (최대 10번까지만 재시도)

  try {
    while (!isImageFound && retryCount < MAX_RETRIES) {
      const formattedDate = `${currentSearchYear}-${targetMonth}-${targetDay}`;
      console.log(`🚀 API 요청 날짜: ${formattedDate}`);

      const response = await axios.get(BASE_URL, {
        params: {
          api_key: API_KEY,
          date: formattedDate,
          hd: true, // 고화질 이미지 요청
        },
      });
      
      if (response.data.media_type === 'image') {
        isImageFound = true;
        finalData = response.data;
      } else {
        console.log(`🎥 ${formattedDate} 데이터는 동영상입니다. 다른 연도를 랜덤 탐색합니다.`);
        // 동영상이면 다른 랜덤 연도로 덮어씌우고 재시도
        currentSearchYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
        retryCount++;
      }
    }
    
    // 만약 10번을 돌았는데도 다 동영상이거나 에러가 났다면 예외 처리
    if (!finalData) {
      throw new Error("이미지 데이터를 찾지 못했습니다.");
    }
    
    return finalData; 
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};