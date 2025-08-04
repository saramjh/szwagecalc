// 🎨 이토스 UX/UI: 토스 브랜드 기반 직업 색상 시스템
// 높은 변별력과 접근성을 고려한 색상 팔레트

export const JOB_COLORS = [
  {
    id: 'primary-blue',
    name: '프라이머리 블루',
    value: '#0066FF',
    textLight: '#FFFFFF',  // 라이트 모드 텍스트
    textDark: '#FFFFFF',   // 다크 모드 텍스트
    inactive: '#0066FF40', // 비활성화 상태 (25% 투명도)
  },
  {
    id: 'success-green', 
    name: '석세스 그린',
    value: '#00C853',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF', 
    inactive: '#00C85340',
  },
  {
    id: 'warning-orange',
    name: '워닝 오렌지', 
    value: '#FF6D00',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF',
    inactive: '#FF6D0040',
  },
  {
    id: 'error-red',
    name: '에러 레드',
    value: '#E53E3E', 
    textLight: '#FFFFFF',
    textDark: '#FFFFFF',
    inactive: '#E53E3E40',
  },
  {
    id: 'premium-purple',
    name: '프리미엄 퍼플',
    value: '#8B5CF6',
    textLight: '#FFFFFF', 
    textDark: '#FFFFFF',
    inactive: '#8B5CF640',
  },
  {
    id: 'classic-brown',
    name: '클래식 브라운',
    value: '#A0522D',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF', 
    inactive: '#A0522D40',
  },
  {
    id: 'deep-teal',
    name: '딥 틸',
    value: '#00695C',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF',
    inactive: '#00695C40',
  },
  {
    id: 'vibrant-magenta', 
    name: '바이브런트 마젠타',
    value: '#D81B60',
    textLight: '#FFFFFF',
    textDark: '#FFFFFF',
    inactive: '#D81B6040',
  },
];

// 기본 색상 (첫 번째 색상)
export const DEFAULT_JOB_COLOR = JOB_COLORS[0];

// 색상 값으로 색상 객체 찾기
export const getJobColorByValue = (colorValue) => {
  return JOB_COLORS.find(color => color.value === colorValue) || DEFAULT_JOB_COLOR;
};

// 라이트/다크 모드에 따른 텍스트 색상 계산
export const getContrastingTextColor = (backgroundColor, isDarkMode = false) => {
  const jobColor = getJobColorByValue(backgroundColor);
  if (jobColor) {
    return isDarkMode ? jobColor.textDark : jobColor.textLight;
  }
  
  // 기존 로직 (커스텀 색상용)
  if (!backgroundColor) return isDarkMode ? '#FFFFFF' : '#1F2937';
  
  // hex 색상을 RGB로 변환
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16); 
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 휘도 계산 (WCAG 기준)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // 50% 기준으로 흰색/검은색 결정
  return luminance > 0.5 ? '#1F2937' : '#FFFFFF';
};

// 칩 스타일 생성 (활성화/비활성화)
export const getJobChipStyle = (job, isActive = false, isDarkMode = false) => {
  const color = job.color || DEFAULT_JOB_COLOR.value;
  const jobColor = getJobColorByValue(color);
  
  if (isActive) {
    return {
      backgroundColor: color,
      color: getContrastingTextColor(color, isDarkMode),
      borderColor: color,
    };
  } else {
    return {
      backgroundColor: jobColor ? jobColor.inactive : color + '40',
      color: isDarkMode ? '#A1A6B2' : '#6B7280', // medium-gray 계열
      borderColor: jobColor ? jobColor.inactive : color + '40',
    };
  }
};