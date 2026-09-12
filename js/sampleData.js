/**
 * sampleData.js - 테스트 및 초기 체험용 현실감 있는 한국 식재료 샘플 데이터
 * 실행 시점의 '오늘 날짜'를 기준으로 D+2, D-day, D-1, D-3, D-7, 여유 있는 유통기한까지 고루 생성합니다.
 */

function formatDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getSampleFoods() {
  return [
    {
      name: '계란 (10구)',
      category: '기타',
      quantity: 1,
      unit: '판',
      location: '냉장고',
      expiryDate: formatDateOffset(-2), // D+2 (유통기한 지남)
      memo: '신선란, 확인 후 빠른 폐기 필요',
      photo: null
    },
    {
      name: '프레시 샌드위치',
      category: '과자',
      quantity: 1,
      unit: '개',
      location: '냉장고',
      expiryDate: formatDateOffset(0), // D-day (오늘 만료)
      memo: '오늘 점심이나 저녁에 꼭 먹기',
      photo: null
    },
    {
      name: '서울우유 1L',
      category: '우유/유제품',
      quantity: 2,
      unit: '팩',
      location: '냉장고',
      expiryDate: formatDateOffset(1), // D-1
      memo: '개봉 후 냉장보관',
      photo: null
    },
    {
      name: '슬라이스 햄',
      category: '육류',
      quantity: 1,
      unit: '팩',
      location: '냉장고',
      expiryDate: formatDateOffset(2), // D-2
      memo: '샌드위치용 햄',
      photo: null
    },
    {
      name: '플레인 요거트 (4입)',
      category: '우유/유제품',
      quantity: 4,
      unit: '개',
      location: '냉장고',
      expiryDate: formatDateOffset(3), // D-3
      memo: '아침 식사 대용',
      photo: null
    },
    {
      name: '국산 찌개용 두부',
      category: '기타',
      quantity: 1,
      unit: '모',
      location: '냉장고',
      expiryDate: formatDateOffset(5), // D-5
      memo: '된장찌개 끓일 예정',
      photo: null
    },
    {
      name: '한돈 삼겹살 500g',
      category: '육류',
      quantity: 1,
      unit: '팩',
      location: '냉장고',
      expiryDate: formatDateOffset(7), // D-7
      memo: '주말 저녁 구이용',
      photo: null
    },
    {
      name: '브로콜리',
      category: '채소',
      quantity: 2,
      unit: '송이',
      location: '냉장고',
      expiryDate: formatDateOffset(8), // D-8
      memo: '살짝 데쳐서 보관',
      photo: null
    },
    {
      name: '꿀사과',
      category: '과일',
      quantity: 5,
      unit: '개',
      location: '실온',
      expiryDate: formatDateOffset(14), // D-14
      memo: '통풍 잘되는 서늘한 곳',
      photo: null
    },
    {
      name: '코카콜라 제로 1.5L',
      category: '음료',
      quantity: 2,
      unit: '병',
      location: '실온',
      expiryDate: formatDateOffset(45), // D-45
      memo: '팬트리 보관',
      photo: null
    },
    {
      name: 'CJ 비비고 왕교자 만두',
      category: '냉동식품',
      quantity: 2,
      unit: '봉',
      location: '냉동실',
      expiryDate: formatDateOffset(120), // D-120
      memo: '냉동 보관 필수',
      photo: null
    },
    {
      name: '진간장 930ml',
      category: '조미료',
      quantity: 1,
      unit: '병',
      location: '실온',
      expiryDate: formatDateOffset(280), // D-280
      memo: '양념장 및 조림용',
      photo: null
    }
  ];
}
