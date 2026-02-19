import axios from 'axios';

const API_KEY = 'g5uadgJR7FIslRVFcfqKpsVXHmmT02eexHiPtwst'; // 나중에 발급받은 실제 키로 교체 필요
const BASE_URL = 'https://api.nasa.gov/planetary/apod';

export const fetchApodData = async (year, month, day) => {
  let targetYear = parseInt(year);
  const targetMonth = month.padStart(2, '0');
  const targetDay = day.padStart(2, '0');

  // [로직] 1995년 6월 16일 이전인지 체크
  // APOD 서비스 시작일이 1995-06-16 입니다.
  const inputDate = new Date(`${targetYear}-${targetMonth}-${targetDay}`);
  const serviceStartDate = new Date('1995-06-16');

  if (inputDate < serviceStartDate) {
    console.log("⚠️ 1995년 이전 날짜 감지! 연도를 랜덤으로 변경합니다.");
    // 1996년 ~ (현재 연도 - 1) 사이 랜덤 연도 생성
    const currentYear = new Date().getFullYear();
    const minYear = 1996;
    const maxYear = currentYear - 1;
    targetYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
  }

  const formattedDate = `${targetYear}-${targetMonth}-${targetDay}`;
  console.log(`🚀 API 요청 날짜: ${formattedDate}`);

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        api_key: API_KEY,
        date: formattedDate,
        hd: true, // 고화질 이미지 요청
      },
    });
    
    // 비디오인 경우 썸네일 처리 등을 위해 media_type도 반환
    return response.data; 
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};