import dayjs from "dayjs"

/**
 * 🕰️ 휴게시간 계산 유틸리티
 * 토스 스타일: 간단하고 직관적인 API 제공
 */

// 기본 근로기준법 휴게시간 정책
export const DEFAULT_BREAK_POLICIES = [
  { minHours: 4, maxHours: 8, breakMinutes: 30 },
  { minHours: 8, maxHours: 12, breakMinutes: 60 }
]

// 캐싱을 위한 Map 생성
const breakTimeCache = new Map()

/**
 * 근무시간에 따른 휴게시간 계산 (메모이제이션 적용)
 * @param {number} workHours - 총 근무시간 (시간 단위)
 * @param {Object} job - 직업 정보 (휴게시간 정책 포함)
 * @returns {Object} { breakMinutes, breakHours, isPaid }
 */
export function calculateBreakTime(workHours, job = {}) {
  // 캐시 키 생성 (소수점 2자리까지만 고려)
  const cacheKey = `${Math.round(workHours * 100) / 100}-${job.id || 'default'}-${job.break_time_enabled}-${JSON.stringify(job.break_time_policies || [])}`
  
  // 캐시에서 확인
  if (breakTimeCache.has(cacheKey)) {
    return breakTimeCache.get(cacheKey)
  }
  // 휴게시간 정책이 비활성화된 경우
  if (job.break_time_enabled === false) {
    return { breakMinutes: 0, breakHours: 0, isPaid: false }
  }

  // 정책 불러오기 (기본값: 근로기준법)
  const policies = job.break_time_policies || DEFAULT_BREAK_POLICIES
  const isPaid = job.break_time_paid || false

  // 적용 가능한 정책 찾기 (근무시간에 맞는 가장 큰 범위)
  let applicablePolicy = null
  
  for (const policy of policies) {
    if (workHours >= policy.minHours && workHours < policy.maxHours) {
      applicablePolicy = policy
      break
    }
  }

  // 적용 가능한 정책이 없으면 휴게시간 없음
  if (!applicablePolicy) {
    return { breakMinutes: 0, breakHours: 0, isPaid }
  }

  const breakMinutes = applicablePolicy.breakMinutes
  const breakHours = Math.round((breakMinutes / 60) * 100) / 100

  const result = {
    breakMinutes,
    breakHours,
    isPaid
  }
  
  // 결과를 캐시에 저장 (최대 1000개 항목 유지)
  if (breakTimeCache.size >= 1000) {
    const firstKey = breakTimeCache.keys().next().value
    breakTimeCache.delete(firstKey)
  }
  breakTimeCache.set(cacheKey, result)
  
  return result
}

/**
 * 시작/종료 시간으로부터 근무시간과 휴게시간 계산
 * @param {string} startTime - "HH:mm" 형식
 * @param {string} endTime - "HH:mm" 형식  
 * @param {Object} job - 직업 정보
 * @returns {Object} { workHours, breakTime, totalHours }
 */
export function calculateWorkAndBreakTime(startTime, endTime, job = {}) {
  if (!startTime || !endTime) {
    return { workHours: 0, breakTime: { breakMinutes: 0, breakHours: 0, isPaid: false }, totalHours: 0 }
  }

  // 시간 파싱
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  const start = dayjs().hour(startHour).minute(startMin)
  let end = dayjs().hour(endHour).minute(endMin)
  
  // 자정 넘어가는 경우 처리
  if (end.isBefore(start)) {
    end = end.add(1, 'day')
  }

  // 총 시간 계산 (분 단위)
  const totalMinutes = end.diff(start, 'minute')
  const totalHours = totalMinutes / 60

  // 휴게시간 계산
  const breakTime = calculateBreakTime(totalHours, job)
  
  // 실 근무시간 = 총 시간 - 휴게시간
  const workHours = totalHours - (breakTime.breakMinutes / 60)

  return {
    workHours: Math.round(workHours * 100) / 100,
    breakTime,
    totalHours: Math.round(totalHours * 100) / 100
  }
}

/**
 * 휴게시간을 보기 좋은 텍스트로 변환
 * @param {number} breakMinutes - 휴게시간 (분)
 * @returns {string} 예: "30분", "1시간 30분"
 */
export function formatBreakTime(breakMinutes) {
  if (breakMinutes === 0) return "휴게시간 없음"
  
  const hours = Math.floor(breakMinutes / 60)
  const minutes = breakMinutes % 60
  
  if (hours === 0) {
    return `${minutes}분`
  } else if (minutes === 0) {
    return `${hours}시간`
  } else {
    return `${hours}시간 ${minutes}분`
  }
}

/**
 * 휴게시간 정책 배열 검증
 * @param {Array} policies - 휴게시간 정책 배열
 * @returns {boolean} 유효성 여부
 */
export function validateBreakPolicies(policies) {
  if (!Array.isArray(policies) || policies.length === 0) {
    return false
  }

  for (const policy of policies) {
    if (
      typeof policy.minHours !== 'number' ||
      typeof policy.maxHours !== 'number' ||
      typeof policy.breakMinutes !== 'number' ||
      policy.minHours < 0 ||
      policy.maxHours <= policy.minHours ||
      policy.breakMinutes < 0
    ) {
      return false
    }
  }

  return true
}

/**
 * 새로운 휴게시간 정책 생성
 * @param {number} minHours - 최소 근무시간
 * @param {number} maxHours - 최대 근무시간  
 * @param {number} breakMinutes - 휴게시간 (분)
 * @returns {Object} 정책 객체
 */
export function createBreakPolicy(minHours, maxHours, breakMinutes) {
  return {
    minHours: Number(minHours),
    maxHours: Number(maxHours), 
    breakMinutes: Number(breakMinutes)
  }
}

/**
 * 휴게시간 계산 캐시 초기화
 * 직업 정책이 변경될 때 호출하여 캐시 무효화
 */
export function clearBreakTimeCache() {
  breakTimeCache.clear()
}

/**
 * 캐시 상태 정보 반환 (디버깅용)
 */
export function getBreakTimeCacheInfo() {
  return {
    size: breakTimeCache.size,
    maxSize: 1000,
    hitRate: breakTimeCache.size > 0 ? 'active' : 'empty'
  }
}

/**
 * 캐시 예열 함수 - 자주 사용되는 패턴들 미리 캐싱
 */
export function warmupBreakTimeCache(jobs) {
  if (!Array.isArray(jobs)) return
  
  const commonWorkHours = [4, 6, 8, 10, 12] // 일반적인 근무시간들
  
  jobs.forEach(job => {
    if (job.break_time_enabled && job.break_time_policies) {
      commonWorkHours.forEach(hours => {
        calculateBreakTime(hours, job) // 캐시에 자동 저장됨
      })
    }
  })
}

/**
 * 휴게시간으로 인한 급여 차액 계산
 * @param {string} startTime - 시작 시간 (HH:mm)
 * @param {string} endTime - 종료 시간 (HH:mm)
 * @param {Object} job - 직업 정보
 * @param {number} hourlyRate - 시급
 * @returns {Object} { breakTimePaid, breakTimeUnpaid, wageDifference }
 */
export function calculateBreakTimeWageDifference(startTime, endTime, job, hourlyRate) {
  if (!startTime || !endTime || !job || !hourlyRate) {
    return {
      breakTimePaid: 0,
      breakTimeUnpaid: 0,
      wageDifference: 0
    }
  }

  const workAndBreakTime = calculateWorkAndBreakTime(startTime, endTime, job)
  
  if (workAndBreakTime.breakTime.breakMinutes === 0) {
    return {
      breakTimePaid: 0,
      breakTimeUnpaid: 0,
      wageDifference: 0
    }
  }

  const breakHours = workAndBreakTime.breakTime.breakHours
  const breakWage = Math.round(breakHours * hourlyRate)

  if (workAndBreakTime.breakTime.isPaid) {
    return {
      breakTimePaid: breakWage,
      breakTimeUnpaid: 0,
      wageDifference: 0 // 유급이므로 차액 없음
    }
  } else {
    return {
      breakTimePaid: 0,
      breakTimeUnpaid: breakWage,
      wageDifference: breakWage // 무급이므로 이만큼 차감
    }
  }
}
