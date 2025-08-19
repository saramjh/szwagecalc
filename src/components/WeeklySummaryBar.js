import React, { useState } from "react"
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"
import isBetween from "dayjs/plugin/isBetween"
// 🚀 트리셰이킹 최적화: 필요한 아이콘만 import  
import { DollarSign, ChevronDown, ChevronUp, Zap, AlertTriangle, CheckCircle, RotateCcw, Pause } from "lucide-react"
import { getWeeklyRecords, calculateWeeklyAllowance, formatWeekRange } from "../utils/weeklyAllowance"

// dayjs 플러그인 확장
dayjs.extend(isoWeek)
dayjs.extend(isBetween)

const WeeklySummaryBar = ({ selectedDate, workRecords, jobs }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 주휴수당이 활성화된 시급제 직업들만 필터링
  const enabledJobs = jobs.filter(job => job.weekly_allowance_enabled)
  
  if (enabledJobs.length === 0) {
    return null
  }

  // 현재 선택된 달의 주들을 계산
  const currentMonth = dayjs(selectedDate)
  const startOfMonth = currentMonth.startOf('month')
  const endOfMonth = currentMonth.endOf('month')
  
  // 해당 월의 모든 주 찾기
  const weeks = []
  let current = startOfMonth.startOf('isoWeek')
  
  while (current.isBefore(endOfMonth) || current.isSame(endOfMonth, 'week')) {
    const weekStart = current
    const weekEnd = current.endOf('isoWeek')
    
    // 해당 주가 현재 월과 겹치는지 확인
    if (weekStart.isSameOrBefore(endOfMonth) && weekEnd.isSameOrAfter(startOfMonth)) {
      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: formatWeekRange(weekStart),
        isCurrentWeek: dayjs().isBetween(weekStart, weekEnd, 'day', '[]')
      })
    }
    current = current.add(1, 'week')
  }

  // 🎯 Etos 디자인: 토스 스타일 요약 데이터 계산
  const summary = weeks.reduce((acc, week) => {
    const weeklyRecords = getWeeklyRecords(workRecords, week.start)
    let weekTotal = 0
    let weekEligible = false
    let weekProgress = false
    let weekUnexcused = false
    
    enabledJobs.forEach(job => {
      const result = calculateWeeklyAllowance(weeklyRecords, job)
      if (result.totalWorkHours > 0) weekProgress = true
      if (result.hasUnexcusedAbsence) weekUnexcused = true
      if (result.eligible) {
        weekEligible = true
        weekTotal += result.allowanceAmount
      }
    })
    
    if (weekProgress) {
      acc.totalWeeks++
      if (weekEligible) acc.eligibleWeeks++
      if (weekUnexcused) acc.unexcusedWeeks++
      acc.totalAmount += weekTotal
    }
    
    return acc
  }, { totalAmount: 0, eligibleWeeks: 0, totalWeeks: 0, unexcusedWeeks: 0 })

  // 이번 주 진행률 계산
  const currentWeekData = (() => {
    const currentWeek = weeks.find(w => w.isCurrentWeek)
    if (!currentWeek) return null
    
    const weeklyRecords = getWeeklyRecords(workRecords, currentWeek.start)
    let totalHours = 0
    let minHours = 15
    let hasAbsence = false
    
    enabledJobs.forEach(job => {
      const result = calculateWeeklyAllowance(weeklyRecords, job)
      totalHours += result.totalWorkHours
      if (result.hasUnexcusedAbsence) hasAbsence = true
    })
    
    return {
      totalHours,
      minHours,
      progress: Math.min((totalHours / minHours) * 100, 100),
      hasAbsence
    }
  })()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
      {/* 🎯 Etos 디자인: 토스 스타일 요약 헤더 (항상 보임) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-mint-green flex-shrink-0" />
              <span className="text-base font-semibold text-dark-navy dark:text-white">
                {currentMonth.format('M월')} 주휴수당
              </span>
            </div>
            
            {/* 토스 스타일 스마트 요약 */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  +{summary.totalAmount.toLocaleString()}원
                </span>
                {summary.totalWeeks > 0 && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({summary.eligibleWeeks}/{summary.totalWeeks}주 지급)
                  </span>
                )}
              </div>
              
              {/* 이번 주 진행률 표시 */}
              {currentWeekData && !currentWeekData.hasAbsence && currentWeekData.totalHours > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400">                  <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" /></span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    이번 주 {currentWeekData.progress.toFixed(0)}% 
                    ({currentWeekData.totalHours.toFixed(1)}h/{currentWeekData.minHours}h)
                  </span>
                  <div className="flex-1 max-w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        currentWeekData.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${currentWeekData.progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {currentWeekData?.hasAbsence && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">                  <AlertTriangle className="w-3 h-3 text-red-500" /></span>
                  <span className="text-xs text-red-600 dark:text-red-400">
                    이번 주 무단결근으로 지급 불가
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* 토스 스타일 확장/축소 버튼 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isExpanded ? '닫기' : '상세보기'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400 transition-transform duration-200" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" />
            )}
          </div>
        </div>
      </button>
      
      {/* 🎯 토스 스타일 확장 영역 (접기/펼치기) */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <div className="space-y-3 mt-3">
            {weeks.map((week, index) => {
              const weeklyRecords = getWeeklyRecords(workRecords, week.start)
              
              // 각 직업별 주휴수당 계산
              let totalAllowance = 0
              let hasEligible = false
              let hasUnexcusedAbsence = false
              let hasProgress = false
              
              const jobResults = enabledJobs.map(job => {
                const result = calculateWeeklyAllowance(weeklyRecords, job)
                
                if (result.totalWorkHours > 0) hasProgress = true
                if (result.hasUnexcusedAbsence) hasUnexcusedAbsence = true
                if (result.eligible) {
                  hasEligible = true
                  totalAllowance += result.allowanceAmount
                }
                
                return { job, result }
              }).filter(({ result }) => result.totalWorkHours > 0)

              // 아무 진행도 없으면 간단히 표시
              if (!hasProgress) {
                return (
                  <div key={index} className="flex items-center justify-between py-2 text-gray-400 dark:text-gray-600">
                    <span className="text-sm">{week.label}</span>
                    <span className="text-xs flex items-center gap-1">
                      <Pause className="w-3 h-3" />
                      대기 중
                    </span>
                  </div>
                )
              }

              return (
                <div key={index} className={`rounded-lg border p-3 ${
                  week.isCurrentWeek 
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' 
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {week.label}
                      </span>
                      {week.isCurrentWeek && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                          이번 주
                        </span>
                      )}
                    </div>
                    
                    <div className="text-right">
                      {hasUnexcusedAbsence ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">                          <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" /></span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            지급 불가
                          </span>
                        </div>
                      ) : hasEligible ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">                          <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" /></span>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                            +{totalAllowance.toLocaleString()}원
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">                          <RotateCcw className="w-3 h-3 text-orange-600 dark:text-orange-400" /></span>
                          <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                            진행 중
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 직업별 상세 정보 */}
                  {jobResults.length > 0 && (
                    <div className="space-y-1">
                      {jobResults.map(({ job, result }) => (
                        <div key={job.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: job.color }}
                            ></div>
                            <span className="text-gray-600 dark:text-gray-400">
                              {job.job_name}
                            </span>
                            <span className="text-gray-500 dark:text-gray-500">
                              {result.totalWorkHours.toFixed(1)}h
                            </span>
                          </div>
                          
                          <div className="text-right">
                            {result.hasUnexcusedAbsence ? (
                              <span className="text-red-500">지급불가</span>
                            ) : result.eligible ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                +{result.allowanceAmount.toLocaleString()}원
                              </span>
                            ) : (
                              <span className="text-orange-500">
                                {(job.weekly_allowance_min_hours - result.totalWorkHours).toFixed(1)}h 부족
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeeklySummaryBar
