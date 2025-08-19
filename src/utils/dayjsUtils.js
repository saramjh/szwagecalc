// 🚀 트리셰이킹 최적화: dayjs 공통 유틸리티
import dayjs from "dayjs"

// 필요한 플러그인들만 한 곳에서 확장
import weekOfYear from "dayjs/plugin/weekOfYear"
import isoWeek from "dayjs/plugin/isoWeek"
import isBetween from "dayjs/plugin/isBetween"
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import "dayjs/locale/ko"

// 플러그인 확장 (한 번만 실행)
dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)
dayjs.extend(isBetween)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.locale('ko')

/**
 * 날짜 포맷팅 유틸리티
 */
export const dateFormat = {
  // YYYY-MM-DD
  toDateString(date) {
    return dayjs(date).format('YYYY-MM-DD')
  },

  // M월 D일 (요일)
  toKoreanDate(date) {
    return dayjs(date).format('M월 D일 (ddd)')
  },

  // YYYY년 M월
  toKoreanMonth(date) {
    return dayjs(date).format('YYYY년 M월')
  },

  // HH:mm
  toTimeString(date) {
    return dayjs(date).format('HH:mm')
  }
}

/**
 * 날짜 계산 유틸리티
 */
export const dateCalc = {
  // 월의 시작일
  startOfMonth(date) {
    return dayjs(date).startOf('month')
  },

  // 월의 마지막일
  endOfMonth(date) {
    return dayjs(date).endOf('month')
  },

  // 주의 시작일 (ISO 주)
  startOfIsoWeek(date) {
    return dayjs(date).startOf('isoWeek')
  },

  // 주의 마지막일 (ISO 주)
  endOfIsoWeek(date) {
    return dayjs(date).endOf('isoWeek')
  },

  // 두 날짜 간의 차이 (일 단위)
  diffInDays(date1, date2) {
    return dayjs(date1).diff(dayjs(date2), 'day')
  },

  // 두 날짜 간의 차이 (분 단위)
  diffInMinutes(date1, date2) {
    return dayjs(date1).diff(dayjs(date2), 'minute')
  }
}

/**
 * 날짜 비교 유틸리티
 */
export const dateCompare = {
  // 같은 날인지 확인
  isSameDay(date1, date2) {
    return dayjs(date1).isSame(dayjs(date2), 'day')
  },

  // 같은 주인지 확인 (ISO 주)
  isSameIsoWeek(date1, date2) {
    return dayjs(date1).isSame(dayjs(date2), 'isoWeek')
  },

  // 날짜가 범위 내에 있는지 확인
  isBetween(date, start, end, unit = 'day', inclusivity = '[]') {
    return dayjs(date).isBetween(dayjs(start), dayjs(end), unit, inclusivity)
  },

  // 이후 날짜인지 확인
  isAfter(date1, date2, unit = 'day') {
    return dayjs(date1).isAfter(dayjs(date2), unit)
  },

  // 이전 날짜인지 확인
  isBefore(date1, date2, unit = 'day') {
    return dayjs(date1).isBefore(dayjs(date2), unit)
  },

  // 같거나 이후 날짜인지 확인
  isSameOrAfter(date1, date2, unit = 'day') {
    return dayjs(date1).isSameOrAfter(dayjs(date2), unit)
  },

  // 같거나 이전 날짜인지 확인
  isSameOrBefore(date1, date2, unit = 'day') {
    return dayjs(date1).isSameOrBefore(dayjs(date2), unit)
  }
}

/**
 * 주차 관련 유틸리티
 */
export const weekUtils = {
  // ISO 주차 번호
  getIsoWeek(date) {
    return dayjs(date).isoWeek()
  },

  // 해당 주의 날짜 범위 포맷
  formatWeekRange(date) {
    const start = dayjs(date).startOf('isoWeek')
    const end = dayjs(date).endOf('isoWeek')
    
    if (start.month() === end.month()) {
      return `${start.format('M/D')}~${end.format('D')}`
    } else {
      return `${start.format('M/D')}~${end.format('M/D')}`
    }
  },

  // 현재 주인지 확인
  isCurrentWeek(date) {
    const now = dayjs()
    const weekStart = dayjs(date).startOf('isoWeek')
    const weekEnd = dayjs(date).endOf('isoWeek')
    return now.isBetween(weekStart, weekEnd, 'day', '[]')
  }
}

// 기본 dayjs 인스턴스 export (필요한 경우)
export default dayjs
