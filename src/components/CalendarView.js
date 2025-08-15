import React, { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react"
import dayjs from "dayjs"
import { parseHHmm } from "../utils/time"
import { supabase } from "../supabaseClient"
import { computeMonthlySummary, findNextPayday } from "../utils/insights"
const DailyRecordListModal = lazy(() => import("./DailyRecordListModal"))
const MonthlyReportModal = lazy(() => import("./MonthlyReportModal"))
const UsageGuideModal = lazy(() => import("./UsageGuideModal"))
const DailyRecordModal = lazy(() => import("./DailyRecordModal"))

const CalendarView = ({ onOpenHourlyRateModal, session, jobs }) => {
	const [date, setDate] = useState(new Date())
	const [workRecords, setWorkRecords] = useState([])
	const [isDailyRecordListModalOpen, setIsDailyRecordListModalOpen] = useState(false)
	const [selectedDateForDailyModal, setSelectedDateForDailyModal] = useState(null)
	const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false)
	const [selectedMonthForMonthlyModal, setSelectedMonthForMonthlyModal] = useState(new Date())
	const [isUsageGuideModalOpen, setIsUsageGuideModalOpen] = useState(false)
  const [summary, setSummary] = useState({ totalIncome: 0, totalHours: 0, averageHourly: 0, nextPaydayText: "" })
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false)
  const [quickPrefill, setQuickPrefill] = useState(null)
	  const [activeBarIndex, setActiveBarIndex] = useState(null)
  const chartRef = useRef(null)

  // Dismiss bubble on outside click, touch, scroll, or resize
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (!chartRef.current) return
      const isInside = chartRef.current.contains(e.target)
      // 터치는 기존 동작 유지(안쪽 터치로 열기 가능). 바깥 터치로 닫기
      if (e.pointerType === 'touch') {
        if (!isInside) setActiveBarIndex(null)
      } else if (e.pointerType === 'mouse') {
        // 데스크탑 클릭은 바깥 클릭 시 닫기
        if (!isInside) setActiveBarIndex(null)
      }
    }
    const handleScrollOrResize = () => setActiveBarIndex(null)

    document.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [])

  // Hide bubble on context changes
  useEffect(() => {
    setActiveBarIndex(null)
  }, [date, selectedDateForDailyModal, isMonthlyModalOpen, isDailyRecordListModalOpen, isUsageGuideModalOpen])

	const fetchWorkRecords = useCallback(async () => {
		try {
			let userId = session && session.user ? session.user.id : null
			if (!userId) {
				const { data: userData } = await supabase.auth.getUser()
				userId = userData && userData.user ? userData.user.id : null
			}
			if (!userId) return
			const { data, error } = await supabase
				.from("work_records")
				.select("*, jobs(job_name)")
				.eq("user_id", userId)
			if (error) {
				console.error("Error fetching work records:", error)
				return
			}
			setWorkRecords(Array.isArray(data) ? data : [])
		} catch (err) {
			console.error("Unexpected error fetching work records:", err)
		}
	}, [session])

	useEffect(() => {
		if (session) {
			fetchWorkRecords()
		}
	}, [session, fetchWorkRecords])

// 초기 마운트 시에도 한번 시도 (세션 지연 대비)
useEffect(() => {
    fetchWorkRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  // Realtime: work_records 변경 시 자동 갱신
  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel('work_records_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'work_records',
        filter: `user_id=eq.${session.user.id}`,
      }, () => {
        fetchWorkRecords()
      })
      .subscribe()
    return () => {
      try { supabase.removeChannel(channel) } catch (_) {}
    }
  }, [session, fetchWorkRecords])

  // Global event bus: other modals dispatch 'work-records-changed' after mutations
  useEffect(() => {
    const handler = () => fetchWorkRecords()
    window.addEventListener('work-records-changed', handler)
    return () => window.removeEventListener('work-records-changed', handler)
  }, [fetchWorkRecords])

  useEffect(() => {
    const sum = computeMonthlySummary(workRecords, date)
    const next = findNextPayday(jobs, date)
    setSummary({
      totalIncome: sum.totalIncome,
      totalHours: sum.totalHours,
      averageHourly: sum.averageHourly,
      nextPaydayText: next ? `${next.date.format("M월 D일")}` : "—",
    })
  }, [workRecords, jobs, date])

    const handleDateClick = (newDate) => {
        setSelectedDateForDailyModal(newDate)
        const formattedDate = dayjs(newDate).format("YYYY-MM-DD")
        const daily = workRecords.filter((r) => r.date === formattedDate)
        if (daily.length === 0) {
            const jobId = jobs && jobs.length > 0 ? jobs[0].id : null
            setQuickPrefill({ jobId, start: "13:00", end: "17:00", wageType: "hourly" })
            setIsQuickModalOpen(true)
        } else {
            setIsDailyRecordListModalOpen(true)
        }
    }

	const handleDailyRecordListModalClose = () => {
		setIsDailyRecordListModalOpen(false)
		setSelectedDateForDailyModal(null)
		fetchWorkRecords()
	}

    const handleMonthlyModalOpen = () => {
        setSelectedMonthForMonthlyModal(date)
        setIsMonthlyModalOpen(true)
    }

	const handleMonthlyModalClose = () => {
		setIsMonthlyModalOpen(false)
	}

	const handleOpenUsageGuideModal = () => {
		setIsUsageGuideModalOpen(true)
	}

	const handleCloseUsageGuideModal = () => {
		setIsUsageGuideModalOpen(false)
	}

	const getPaydayJobsForDate = (date) => {
		return jobs.filter((job) => {
			if (!job.payday) return false
			const currentYear = date.getFullYear()
			const currentMonth = date.getMonth()
			const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
			const actualPayday = Math.min(job.payday, lastDayOfMonth)
			return date.getDate() === actualPayday
		})
	}

    const generateCalendarCells = () => {
        const current = dayjs(date)
        const startOfMonth = current.startOf("month")
        const daysInMonth = current.daysInMonth()
        const startWeekday = startOfMonth.day() // 0=Sun
        const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7
        const cells = []

        // income buckets for heatmap
        const incomeByDate = new Map()
        for (const r of workRecords) {
            const key = r.date
            incomeByDate.set(key, (incomeByDate.get(key) || 0) + (r.daily_wage || 0))
        }
        const values = Array.from(incomeByDate.values())
        const maxIncome = values.length ? Math.max(...values) : 0
        const bucketFor = (amt) => {
            if (!maxIncome || !amt) return 0
            const ratio = amt / maxIncome
            if (ratio >= 0.9) return 5
            if (ratio >= 0.7) return 4
            if (ratio >= 0.5) return 3
            if (ratio >= 0.3) return 2
            return 1
        }

        for (let i = 0; i < totalCells; i++) {
            const dayNum = i - startWeekday + 1
            const inMonth = dayNum >= 1 && dayNum <= daysInMonth
            const cellDate = inMonth ? startOfMonth.add(dayNum - 1, "day").toDate() : null

            if (!inMonth) {
                cells.push(
                    <div key={`empty-${i}`} className="calendar-cell">
                        <div className="calendar-cell-inner cell-stroke bg-transparent" />
                    </div>
                )
                continue
            }

            const paydayJobs = getPaydayJobsForDate(cellDate)
            const formattedDate = dayjs(cellDate).format("YYYY-MM-DD")
            const dailyRecords = workRecords.filter((rec) => rec.date === formattedDate)
            // still compute hours if needed later (currently unused for pill)
            // const totalHours = dailyRecords.reduce((acc, record) => {
            //   if (!record.start_time || !record.end_time) return acc
            //   const start = dayjs(record.start_time, "HH:mm")
            //   let end = dayjs(record.end_time, "HH:mm")
            //   if (end.isBefore(start)) end = end.add(1, "day")
            //   return acc + end.diff(start, "minute") / 60
            // }, 0)

            const isToday = dayjs().isSame(dayjs(cellDate), "day")
            const dow = dayjs(cellDate).day()
            const income = incomeByDate.get(formattedDate) || 0
            const heat = bucketFor(income)
            // compute total records and total hours for chips
            const recordCount = dailyRecords.length
            const totalMinutes = dailyRecords.reduce((acc, rec) => {
                if (!rec.start_time || !rec.end_time) return acc
                const start = parseHHmm(rec.start_time)
                let end = parseHHmm(rec.end_time)
                if (!start || !end) return acc
                if (end.isBefore(start)) end = end.add(1, "day")
                return acc + end.diff(start, "minute")
            }, 0)
            const hoursFloat = totalMinutes / 60
            const chipHours = hoursFloat.toFixed(1)
            cells.push(
                <div key={formattedDate} className="calendar-cell">
                    <button
                        onClick={() => handleDateClick(cellDate)}
                        className={`calendar-cell-inner cell-stroke hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors heat-${heat} ${
                            paydayJobs.length > 0 ? "payday-ring" : ""
                        } ${isToday ? "today-ring" : ""}`}
                    >
                        <div className={`calendar-day text-xs sm:text-sm font-semibold ${dow === 0 ? 'text-coral-pink' : dow === 6 ? 'text-mint-green-light' : 'text-dark-navy dark:text-white'}`}>
                            {dayNum}
                        </div>
                        <div className="calendar-badge">
                            {recordCount > 0 && (
                                <span className="badge-pill">
                                    <span className="badge-count">{recordCount}</span>
                                    <span className="badge-text">{chipHours}h</span>
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            )
        }

        return cells
    }

	const usageManualContent = `1. 직업 설정:
햄버거 메뉴(☰) > '직업 관리'에서 나의 직업을 추가하세요.

2. 시급 설정:
'시급 설정' 버튼을 눌러 직업별 시급과 적용 시작일을 설정하세요.

3. 근무 기록:
달력에서 날짜를 선택하여 근무 기록을 추가하고 관리하세요.

4. 월급 확인:
'월급 확인' 버튼을 눌러 월별 근무 보고서를 확인하세요.`

    const handlePrevMonth = () => setDate(dayjs(date).subtract(1, "month").toDate())
    const handleNextMonth = () => setDate(dayjs(date).add(1, "month").toDate())
    const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"]

    return (
        <div className="p-4 relative z-0  w-full">
      <div className="mb-4 space-y-2">
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow p-3 flex justify-between">
          <div className="text-sm text-medium-gray dark:text-light-gray">이번달 누적</div>
          <div className="text-base font-bold text-dark-navy dark:text-white">{(summary.totalIncome || 0).toLocaleString()}원 · {Number.isFinite(summary.totalHours) ? summary.totalHours.toFixed(1) : '0.0'}h</div>
        </div>
        {/* 예상 소득 카드 제거 */}
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow p-3 flex justify-between">
          <div className="text-sm text-medium-gray dark:text-light-gray">다음 급여일</div>
          <div className="text-base font-bold text-dark-navy dark:text-white">{summary.nextPaydayText}</div>
        </div>
      </div>
            <div className="bg-cream-white dark:bg-charcoal-gray rounded-lg shadow-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={handlePrevMonth} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-dark-navy dark:text-white">◀</button>
                    <div className="text-lg sm:text-xl font-bold text-dark-navy dark:text-white">{dayjs(date).format("YYYY년 M월")}</div>
                    <button onClick={handleNextMonth} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-dark-navy dark:text-white">▶</button>
                </div>
                <div className="grid grid-cols-7 text-center text-xs sm:text-sm text-medium-gray dark:text-light-gray mb-1">
                    {daysOfWeek.map((d, i) => (
                        <div key={d} className={`py-1 ${i === 0 ? 'text-coral-pink' : i === 6 ? 'text-mint-green-light' : ''}`}>{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 calendar-grid">
                    {generateCalendarCells()}
                </div>
                {/* 주간 요약 미니 타임라인 (선택일/현재 주 기준, 기존 기록 반영) */}
                {(() => {
                  const anchor = selectedDateForDailyModal || date
                  const start = dayjs(anchor).startOf("week")
                  // 날짜별 합계 맵 (YYYY-MM-DD → sum)
                  const totalsByDate = (workRecords || []).reduce((map, r) => {
                    const key = dayjs(r.date).format("YYYY-MM-DD")
                    map[key] = (map[key] || 0) + (r.daily_wage || 0)
                    return map
                  }, {})
                  const dayKeys = Array.from({ length: 7 }).map((_, i) => start.add(i, "day").format("YYYY-MM-DD"))
                  const incomes = dayKeys.map((k) => totalsByDate[k] || 0)
                  const max = Math.max(...incomes, 1)
					return (
                        <div ref={chartRef} className="mt-4 pt-1 p-2 bg-white dark:bg-gray-800 rounded-lg shadow select-none">
							{/* 막대 영역: 고정 높이 + 그리드 배경 */}
							<div className="relative h-20 rounded-md">
								{/* 가이드 그리드 (25% 간격) */}
								<div
									className="absolute inset-0 pointer-events-none opacity-60"
									style={{
										background:
											"repeating-linear-gradient(to top, rgba(0,0,0,0.06), rgba(0,0,0,0.06) 1px, transparent 1px, transparent 16px)",
									}}
								/>
								<div className="relative flex items-end h-full gap-2 w-full">
									{incomes.map((val, i) => {
										const h = Math.max(4, Math.round((val / max) * 80))
                                    return (
                                        <div
                                            key={i}
                                            className="relative flex-1 min-w-0 flex justify-center"
                                            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActiveBarIndex(i) }}
                                            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActiveBarIndex(null) }}
                                            onPointerDown={(e) => {
                                                if (e.pointerType === 'touch') setActiveBarIndex(i)
                                                if (e.pointerType === 'mouse') setActiveBarIndex(i)
                                            }}
                                            role="button"
                                            aria-label={`수입 ${val.toLocaleString()}원`}
                                        >
                                            <div className="w-8 bg-mint-green rounded-t-md shadow-sm" style={{ height: `${h}px` }} />
                                            {activeBarIndex === i && val > 0 && (
                                                <div
                                                    className="absolute left-1/2 -translate-x-1/2"
                                                    style={{ bottom: `${h + 6}px` }}
                                                >
                                                    {/* speech bubble with bordered tail */}
                                                    <div className="relative inline-block whitespace-nowrap">
                                                        <div className="px-2 py-1 bg-white dark:bg-gray-900 border border-mint-green text-[12px] font-semibold text-dark-navy dark:text-white rounded-full shadow">
                                                            +{val.toLocaleString()}원
                                                        </div>
                                                        {/* outer border tail */}
                                                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-mint-green" />
                                                        {/* inner fill tail */}
                                                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] dark:border-t-gray-900 border-t-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
									})}
								</div>
							</div>
							{/* 라벨 영역: 요일만 표기 */}
							<div className="mt-1 flex gap-2">
								{incomes.map((val, i) => (
									<div key={`label-${i}`} className="flex-1 min-w-0 text-center">
										<div className="text-[11px] text-medium-gray">{["일","월","화","수","목","금","토"][i]}</div>
									</div>
								))}
							</div>
						</div>
					)
                })()}
            </div>
            <div className="flex flex-col space-y-2 mt-4 w-full justify-center">
				<button
					onClick={onOpenHourlyRateModal}
                    className="w-full px-3 py-2 bg-lemon-yellow text-dark-navy rounded-full text-base font-medium shadow-md
                   hover:bg-lemon-yellow focus:outline-none focus:ring-2 focus:ring-lemon-yellow focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105 mb-2 sm:mb-0">
					시급 설정
				</button>
				<button
					onClick={handleMonthlyModalOpen}
                    className="w-full px-3 py-2 bg-mint-green text-white rounded-full text-base font-medium shadow-md
                   hover:bg-mint-green focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105 mb-2 sm:mb-0">
					월급 확인
				</button>
				<button
					onClick={handleOpenUsageGuideModal}
                    className="w-full px-3 py-2 bg-medium-gray text-white rounded-full text-base font-medium shadow-md
                   hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105">
					사용법
				</button>
			</div>
            <Suspense fallback={null}>
                <DailyRecordListModal selectedDate={selectedDateForDailyModal} isOpen={isDailyRecordListModalOpen} onClose={handleDailyRecordListModalClose} session={session} jobs={jobs} />
            </Suspense>
            <Suspense fallback={null}>
                <MonthlyReportModal selectedMonth={selectedMonthForMonthlyModal} isOpen={isMonthlyModalOpen} onClose={handleMonthlyModalClose} session={session} jobs={jobs} />
            </Suspense>
            <Suspense fallback={null}>
                <UsageGuideModal isOpen={isUsageGuideModalOpen} onClose={handleCloseUsageGuideModal} manualContent={usageManualContent} />
            </Suspense>
            <Suspense fallback={null}>
              {isQuickModalOpen && (
                <DailyRecordModal
                  selectedDate={selectedDateForDailyModal}
                  isOpen={isQuickModalOpen}
                  onClose={() => setIsQuickModalOpen(false)}
                  session={session}
                  jobs={jobs}
                  prefill={quickPrefill}
                />
              )}
            </Suspense>
		</div>
	)
}

export default CalendarView
