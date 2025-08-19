import React from "react"
import { getCurrentWeekProgress, formatWeekRange } from "../utils/weeklyAllowance"
import { Calendar, AlertTriangle } from "lucide-react"
import dayjs from "dayjs"

const WeeklyAllowanceCard = ({ workRecords, jobs, selectedDate = new Date() }) => {
  // 주휴수당이 활성화된 직업들만 필터링
  const enabledJobs = jobs.filter(job => job.weekly_allowance_enabled)
  
  if (enabledJobs.length === 0) {
    return null // 주휴수당 적용 직업이 없으면 숨김
  }

  // 현재 주의 진행 상황 계산
  const weekProgresses = enabledJobs.map(job => {
    const progress = getCurrentWeekProgress(workRecords, job, selectedDate)
    return { job, progress }
  })

  // 주휴수당 대상인 직업이 하나라도 있는지 확인
  const hasEligibleJobs = weekProgresses.some(({ progress }) => progress.eligible)
  const hasProgressJobs = weekProgresses.some(({ progress }) => progress.totalWorkHours > 0)

  if (!hasProgressJobs) {
    return null // 아무 진행도 없으면 숨김
  }

  const currentWeek = formatWeekRange(dayjs(selectedDate).startOf('isoWeek'))

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
      <div className="flex items-center justify-between mb-3">
      <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            주휴수당
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">{currentWeek}</p>
        <div className="text-right">
          {hasEligibleJobs ? (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">지급 대상</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span className="text-sm font-medium text-orange-700 dark:text-orange-400">진행 중</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {weekProgresses.map(({ job, progress }) => {
          if (progress.totalWorkHours === 0) return null

          const minHours = job.weekly_allowance_min_hours || 15
          const progressPercent = Math.min(100, (progress.totalWorkHours / minHours) * 100)

          return (
            <div key={job.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: job.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {job.job_name}
                  </span>
                  {progress.hasUnexcusedAbsence && (
                    <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    결근
                  </span>
                  )}
                </div>
                <div className="text-right">
                  {progress.hasUnexcusedAbsence ? (
                    <div className="text-xs text-red-600 dark:text-red-400 font-semibold">
                      지급 불가
                    </div>
                  ) : progress.eligible ? (
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                      +{progress.allowanceAmount?.toLocaleString()}원
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {progress.hoursNeeded.toFixed(1)}시간 남음
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>{progress.totalWorkHours.toFixed(1)}시간</span>
                  <span>{minHours}시간</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      progress.hasUnexcusedAbsence
                        ? 'bg-red-500' 
                        : progress.eligible 
                          ? 'bg-green-500' 
                          : progressPercent >= 80 
                            ? 'bg-orange-500' 
                            : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress.hasUnexcusedAbsence ? 100 : progressPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{progress.workDays}일 근무</span>
                {progress.eligible && progress.avgDailyHours && (
                  <span>평균 {progress.avgDailyHours}시간/일</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 전체 주휴수당 요약 */}
      {hasEligibleJobs && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              이번 주 주휴수당
            </span>
            <span className="text-base font-bold text-green-600 dark:text-green-400">
              +{weekProgresses
                .filter(({ progress }) => progress.eligible)
                .reduce((total, { progress }) => total + (progress.allowanceAmount || 0), 0)
                .toLocaleString()}원
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyAllowanceCard
