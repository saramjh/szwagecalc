import dayjs from "dayjs"
import weekOfYear from "dayjs/plugin/weekOfYear"
import isoWeek from "dayjs/plugin/isoWeek"
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"
import { calculateWorkAndBreakTime } from "./breakTime"

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)

// 주휴수당 계산 캐시
const weeklyAllowanceCache = new Map()

/**
 * 주휴수당 계산 로직
 * @param {Array} weeklyRecords - 한 주간의 근무 기록들
 * @param {Object} job - 직업 정보
 * @returns {Object} { eligible, totalWorkHours, averageHourlyRate, allowanceAmount, workDays }
 */
export function calculateWeeklyAllowance(weeklyRecords, job) {
  // 주휴수당이 비활성화된 경우
  if (!job?.weekly_allowance_enabled) {
    return {
      eligible: false,
      totalWorkHours: 0,
      averageHourlyRate: 0,
      allowanceAmount: 0,
      workDays: 0,
      reason: "주휴수당 적용 안함"
    }
  }

  const minHours = job.weekly_allowance_min_hours || 15.0
  let totalWorkHours = 0
  let totalWage = 0
  let workDays = 0
  let hasUnexcusedAbsence = false
  const workDaysSet = new Set()

  // 주간 근무시간 및 급여 합계 계산 (시급제만)
  for (const record of weeklyRecords) {
    // 해당 직업의 시급제 기록만 처리
    if (record.job_id !== job.id || record.wage_type !== "hourly") continue
    
    // 무단결근 체크
    if (record.is_unexcused_absence) {
      hasUnexcusedAbsence = true
    }
    
    if (!record.start_time || !record.end_time) continue
    
    // 실제 근무시간 계산 (휴게시간 제외)
    const workAndBreakTime = calculateWorkAndBreakTime(
      record.start_time, 
      record.end_time, 
      record.jobs || job
    )
    
    totalWorkHours += workAndBreakTime.workHours
    totalWage += (record.daily_wage || 0) - (record.meal_allowance || 0) // 식대 제외
    workDaysSet.add(record.date) // 중복 날짜 제거
  }

  workDays = workDaysSet.size

  // 무단결근이 있는 경우 주휴수당 지급 불가
  if (hasUnexcusedAbsence) {
    return {
      eligible: false,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      averageHourlyRate: 0,
      allowanceAmount: 0,
      workDays,
      hasUnexcusedAbsence: true,
      reason: "무단결근으로 인한 주휴수당 지급 불가"
    }
  }

  // 15시간 미만인 경우 주휴수당 없음
  if (totalWorkHours < minHours) {
    return {
      eligible: false,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      averageHourlyRate: 0,
      allowanceAmount: 0,
      workDays,
      hasUnexcusedAbsence: false,
      reason: `주간 근무시간 부족 (${totalWorkHours.toFixed(1)}시간 < ${minHours}시간)`
    }
  }

  // 근무일이 0인 경우
  if (workDays === 0) {
    return {
      eligible: false,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      averageHourlyRate: 0,
      allowanceAmount: 0,
      workDays: 0,
      hasUnexcusedAbsence: false,
      reason: "해당 직업 근무일 없음"
    }
  }

  // 평균 시급 계산: 총 급여 / 총 근무시간
  const averageHourlyRate = totalWage > 0 ? Math.round(totalWage / totalWorkHours) : 0
  
  // 평균 일 근무시간 계산
  const avgDailyHours = totalWorkHours / workDays
  
  // 주휴수당 = 평균 일 근무시간 × 평균 시급
  const allowanceAmount = Math.round(avgDailyHours * averageHourlyRate)

  return {
    eligible: true,
    totalWorkHours: Math.round(totalWorkHours * 100) / 100,
    averageHourlyRate,
    allowanceAmount,
    workDays,
    avgDailyHours: Math.round(avgDailyHours * 100) / 100,
    hasUnexcusedAbsence: false,
    reason: "주휴수당 지급 대상"
  }
}

/**
 * 특정 주의 근무 기록들을 필터링
 * @param {Array} records - 전체 근무 기록들
 * @param {string|Date} referenceDate - 기준 날짜
 * @returns {Array} 해당 주의 근무 기록들
 */
export function getWeeklyRecords(records, referenceDate) {
  const ref = dayjs(referenceDate)
  const startOfWeek = ref.startOf('isoWeek') // 월요일 시작
  const endOfWeek = ref.endOf('isoWeek')     // 일요일 끝
  
  return records.filter(record => {
    const recordDate = dayjs(record.date)
    return recordDate.isSameOrAfter(startOfWeek, 'day') && 
           recordDate.isSameOrBefore(endOfWeek, 'day')
  })
}

/**
 * 월간 주휴수당 요약 계산
 * @param {Array} records - 전체 근무 기록들
 * @param {Array} jobs - 직업 목록
 * @param {string|Date} monthDate - 기준 월
 * @returns {Object} 월간 주휴수당 요약
 */
export function calculateMonthlyWeeklyAllowance(records, jobs, monthDate) {
  const month = dayjs(monthDate)
  const startOfMonth = month.startOf('month')
  const endOfMonth = month.endOf('month')
  
  // 해당 월의 모든 주 찾기
  const weeks = []
  let current = startOfMonth.startOf('isoWeek')
  
  while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'week')) {
    weeks.push(current)
    current = current.add(1, 'week')
  }
  
  let totalAllowance = 0
  let eligibleWeeks = 0
  const jobAllowances = new Map()
  
  // 각 주별로 계산
  for (const weekStart of weeks) {
    const weeklyRecords = getWeeklyRecords(records, weekStart)
    
    // 직업별 주휴수당 계산
    for (const job of jobs) {
      if (!job.weekly_allowance_enabled) continue
      
      const allowanceResult = calculateWeeklyAllowance(weeklyRecords, job)
      
      if (allowanceResult.eligible && allowanceResult.allowanceAmount > 0) {
        totalAllowance += allowanceResult.allowanceAmount
        eligibleWeeks++
        
        if (!jobAllowances.has(job.id)) {
          jobAllowances.set(job.id, {
            jobName: job.job_name,
            jobColor: job.color,
            totalAmount: 0,
            weekCount: 0
          })
        }
        
        const jobSummary = jobAllowances.get(job.id)
        jobSummary.totalAmount += allowanceResult.allowanceAmount
        jobSummary.weekCount++
      }
    }
  }
  
  return {
    totalAllowance,
    eligibleWeeks,
    totalWeeks: weeks.length,
    jobAllowances: Array.from(jobAllowances.values())
  }
}

/**
 * 현재 주의 진행 상황 계산
 * @param {Array} records - 근무 기록들
 * @param {Object} job - 직업 정보
 * @param {string|Date} referenceDate - 기준 날짜 (기본: 오늘)
 * @returns {Object} 현재 주 진행 상황
 */
export function getCurrentWeekProgress(records, job, referenceDate = new Date()) {
  const today = dayjs(referenceDate)
  const weeklyRecords = getWeeklyRecords(records, today)
  const result = calculateWeeklyAllowance(weeklyRecords, job)
  
  const startOfWeek = today.startOf('isoWeek')
  const endOfWeek = today.endOf('isoWeek')
  const daysInWeek = endOfWeek.diff(startOfWeek, 'day') + 1
  const daysPassed = today.diff(startOfWeek, 'day') + 1
  
  const minHours = job?.weekly_allowance_min_hours || 15.0
  const progress = Math.min(100, (result.totalWorkHours / minHours) * 100)
  
  return {
    ...result,
    weekStart: startOfWeek.format('YYYY-MM-DD'),
    weekEnd: endOfWeek.format('YYYY-MM-DD'),
    daysInWeek,
    daysPassed,
    progressPercent: Math.round(progress),
    hoursNeeded: Math.max(0, minHours - result.totalWorkHours),
    isCurrentWeek: true
  }
}

/**
 * 주휴수당 계산 캐시 초기화
 */
export function clearWeeklyAllowanceCache() {
  weeklyAllowanceCache.clear()
}

/**
 * 주간을 문자열로 포맷
 * @param {string|Date} weekStart - 주 시작일
 * @returns {string} 예: "12월 2주차 (12/9~12/15)"
 */
export function formatWeekRange(weekStart) {
  const start = dayjs(weekStart)
  const end = start.endOf('isoWeek')
  const weekOfMonth = Math.ceil(start.date() / 7)
  
  return `${start.format('M월')} ${weekOfMonth}주차 (${start.format('M/D')}~${end.format('M/D')})`
}
