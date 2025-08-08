// 🎨 시급이요 브랜드 기반 직업 색상 시스템 (토스 스타일)

export const JOB_COLORS = [
  {
    id: 'brand-purple',
    name: '브랜드 퍼플',
    value: 'var(--accent-primary)',
    textLight: 'var(--accent-text)',
    textDark: 'var(--accent-text)',
    inactive: 'rgba(139, 92, 246, 0.25)', // --accent-primary 25%
  },
  {
    id: 'success-green', 
    name: '석세스 그린',
    value: 'var(--success-primary)',
    textLight: 'var(--text-inverse)',
    textDark: 'var(--text-inverse)', 
    inactive: 'rgba(34, 197, 94, 0.25)',
  },
  {
    id: 'warning-orange',
    name: '워닝 오렌지', 
    value: 'var(--warning-primary)',
    textLight: 'var(--text-inverse)',
    textDark: 'var(--text-inverse)',
    inactive: 'rgba(249, 115, 22, 0.25)',
  },
  {
    id: 'error-red',
    name: '에러 레드',
    value: 'var(--error-primary)',
    textLight: 'var(--text-inverse)',
    textDark: 'var(--text-inverse)',
    inactive: 'rgba(239, 68, 68, 0.25)',
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
  // CSS 변수 사용 시에는 토큰 매핑 우선
  const match = JOB_COLORS.find(c => c.value === backgroundColor);
  if (match) return isDarkMode ? match.textDark : match.textLight;

  // 기존 로직 (커스텀 hex 색상용)
  if (!backgroundColor) return isDarkMode ? '#FFFFFF' : '#1F2937';
  if (backgroundColor.startsWith('var(')) return isDarkMode ? 'var(--text-inverse)' : 'var(--text-inverse)';

  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16); 
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
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
      backgroundColor: jobColor ? jobColor.inactive : 'rgba(0,0,0,0.1)',
      color: isDarkMode ? 'var(--text-secondary)' : 'var(--text-secondary)',
      borderColor: jobColor ? jobColor.inactive : 'rgba(0,0,0,0.1)',
    };
  }
};