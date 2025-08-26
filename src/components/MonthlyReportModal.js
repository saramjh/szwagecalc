import React, { useState, useEffect, useCallback, useMemo } from "react"
import dayjs from "dayjs"
import { dateCalc } from "../utils/dayjsUtils" // Import dateCalc
import "dayjs/locale/ko"
import { Target, FileText, TrendingDown, Clock } from "lucide-react"
import { supabase } from "../supabaseClient"
import { getJobChipStyle } from "../constants/JobColors"
import { parseHHmm } from "../utils/time"
import { calculateWorkAndBreakTime, formatBreakTime, calculateBreakTimeWageDifference } from "../utils/breakTime"
import { useReportCache } from "../contexts/ReportCacheContext";
import { calculateMonthlyWeeklyAllowance, formatWeekRange } from "../utils/weeklyAllowance"

// 휴게시간 정책을 반영한 급여 재계산 헬퍼 함수
function recalculateWageWithBreakTime(record) {
  // 일급제는 저장된 값 그대로 사용
  if (record.wage_type === "daily") {
    return record.daily_wage || 0
  }
  
  // 시급제는 휴게시간 정책을 반영하여 재계산
  if (record.start_time && record.end_time && record.jobs) {
    const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
    
    // 휴게시간이 없거나 무급인 경우에만 재계산 필요
    if (workAndBreakTime.breakTime.breakMinutes === 0 || !workAndBreakTime.breakTime.isPaid) {
      // 급여 대상 시간 계산
      let payableHours = workAndBreakTime.workHours
      if (workAndBreakTime.breakTime.isPaid) {
        payableHours = workAndBreakTime.totalHours
      }
      
      // 기존 저장된 값에서 시급 역산 (식대 제외)
      const wageWithoutMeal = (record.daily_wage || 0) - (record.meal_allowance || 0)
      // 💡 저장된 급여는 이미 휴게시간이 반영된 값이므로 실제 급여 대상 시간으로 나누어야 함
      let payableHoursForRate = workAndBreakTime.workHours // 기본: 순 근무시간
      if (workAndBreakTime.breakTime.isPaid) {
        payableHoursForRate = workAndBreakTime.totalHours // 유급인 경우: 총 시간
      }
      const estimatedHourlyRate = Math.round(wageWithoutMeal / (payableHoursForRate || 1))
      const recalculatedWage = Math.round(payableHours * estimatedHourlyRate) + (record.meal_allowance || 0)
      
      return recalculatedWage
    }
  }
  
  // 기본값: 저장된 값 사용
  return record.daily_wage || 0
}

dayjs.locale('ko')

const MonthlyReportModal = ({ isOpen, onClose, selectedMonth, session, jobs }) => {
	const [monthlyRecords, setMonthlyRecords] = useState([])
	const [totalWorkHours, setTotalWorkHours] = useState(0)
	const [totalMealAllowance, setTotalMealAllowance] = useState(0)
	const [totalGrossIncome, setTotalGrossIncome] = useState(0)
	const [totalBreakMinutes, setTotalBreakMinutes] = useState(0)
	const [totalWageDifference, setTotalWageDifference] = useState(0)
	const [hourlyRatesMap, setHourlyRatesMap] = useState(new Map()) // 총 휴게시간 (분)
	const [weeklyAllowanceSummary, setWeeklyAllowanceSummary] = useState({ totalAllowance: 0, eligibleWeeks: 0, totalWeeks: 0, jobAllowances: [] }) // 주휴수당 요약
	const [selectedJobFilterId, setSelectedJobFilterId] = useState("all") // 선택된 직업 필터 ID 상태 ('all' 또는 job.id)

	const [showModal, setShowModal] = useState(false) // 모달의 실제 렌더링 여부
	const [animateModal, setAnimateModal] = useState(false) // 애니메이션 클래스 적용 여부
  const { getCachedReport, setCachedReport } = useReportCache();

	useEffect(() => {
		if (isOpen) {
			setShowModal(true) // 모달을 DOM에 렌더링 시작
			setTimeout(() => setAnimateModal(true), 10) // 약간의 지연 후 애니메이션 시작
			document.body.classList.add("modal-open") // 모달이 열릴 때 body 스크롤 잠금
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => setShowModal(false), 300) // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
			document.body.classList.remove("modal-open") // 모달이 닫힐 때 body 스크롤 잠금 해제
		}
	}, [isOpen])

	// 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
	useEffect(() => {
		return () => {
			document.body.classList.remove("modal-open")
		}
	}, [])

	// 직업 ID로 빠른 조회를 위한 Map 생성 (메모이제이션)
	const jobsMap = useMemo(() => {
		const map = new Map()
		jobs.forEach(job => map.set(job.id, job))
		return map
	}, [jobs])

  // 🎯 선택된 월의 기록만 필터링 (메모이제이션)
  const recordsForSelectedMonth = useMemo(() => {
    if (!monthlyRecords || !selectedMonth) return [];
    const targetMonth = dayjs(selectedMonth).month();
    return monthlyRecords.filter(record => dayjs(record.date).month() === targetMonth);
  }, [monthlyRecords, selectedMonth]);

	const calculateMonthlySummary = useCallback((records) => {
		let totalIncome = 0
		let totalHours = 0
		let totalMeal = 0
		let totalBreak = 0
		let totalDiff = 0

        records.forEach((record) => {
			totalIncome += recalculateWageWithBreakTime(record)
			totalMeal += record.meal_allowance || 0

          if (record.start_time && record.end_time) {
                const start = parseHHmm(record.start_time)
                let end = parseHHmm(record.end_time)
                if (start && end) {
                    if (end.isBefore(start)) {
                        end = end.add(1, "day")
                    }
                    totalHours += end.diff(start, "minute") / 60
                    
                    // 휴게시간 및 차액 계산 (Map을 사용한 빠른 조회)
                    const job = jobsMap.get(record.job_id)
                    if (job) {
                        const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, job)
                        totalBreak += workAndBreakTime.breakTime.breakMinutes
                        
                        // 시급제인 경우에만 차액 계산
                        if (record.wage_type === "hourly") {
                            // 🎯 실제 설정된 시급 사용
                            const actualHourlyRate = hourlyRatesMap.get(record.id) || 0
                            const wageDiff = calculateBreakTimeWageDifference(
                                record.start_time, 
                                record.end_time, 
                                job, 
                                actualHourlyRate
                            )
                            totalDiff += wageDiff.wageDifference
                        }
                    }
                }
          }
		})

				setTotalGrossIncome(totalIncome);
		setTotalWorkHours(totalHours);
		setTotalMealAllowance(totalMeal);
		setTotalBreakMinutes(totalBreak);
		setTotalWageDifference(totalDiff);
  	}, [jobsMap, hourlyRatesMap]);

	// 시급 정보 일괄 조회
	const fetchHourlyRates = useCallback(async (records) => {
		if (!session || !records.length) return

		const ratesMap = new Map()

		// 각 기록별로 시급 조회
		for (const record of records) {
			if (record.wage_type === "hourly" && record.job_id && record.date) {
				// 날짜 유효성 검사
				if (!dayjs(record.date).isValid()) {
					console.warn("Invalid record date:", record.date)
					continue
				}
				const { data, error } = await supabase
					.from("hourly_rate_history")
					.select("hourly_rate")
					.eq("job_id", record.job_id)
					.eq("user_id", session.user.id)
					.lte("effective_date", record.date)
					.or("end_date.is.null,end_date.gte." + record.date)
					.order("effective_date", { ascending: false })
					.limit(1)

				if (!error && data?.[0]) {
					ratesMap.set(record.id, data[0].hourly_rate)
				}
			}
		}

		setHourlyRatesMap(ratesMap)
	}, [session])

  const formatDuration = (start_time, end_time) => {
    if (!start_time || !end_time) return '0시간 0분';
    const start = parseHHmm(start_time);
    let end = parseHHmm(end_time);
    if (!start || !end) return '0시간 0분';

    if (end.isBefore(start)) {
        end = end.add(1, "day");
    }

    const minutesTotal = end.diff(start, "minute");
    const hours = Math.floor(minutesTotal / 60);
    const minutes = minutesTotal % 60;

    let formatted = '';
    if (hours > 0) {
        formatted += `${hours}시간 `;
    }
    formatted += `${minutes}분`;

    return formatted.trim();
};

  const formatTotalHours = (totalHours) => {
    if (!Number.isFinite(totalHours) || totalHours === 0) return '0시간 0분';

    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    let formatted = '';
    if (hours > 0) {
        formatted += `${hours}시간 `;
    }
    formatted += `${minutes}분`;

    return formatted.trim();
  };

  const fetchMonthlyRecords = useCallback(async () => {
    if (!session) return;

    const monthStr = dayjs(selectedMonth).format('YYYY-MM');
    const cacheKey = `${monthStr}-${selectedJobFilterId}`;
    const cachedData = getCachedReport(monthStr, selectedJobFilterId);

    if (cachedData) {
      setMonthlyRecords(cachedData);
      return;
    }

    const { startDate: reportStartDate, endDate: reportEndDate } = dateCalc.getReportBoundaries(dayjs(selectedMonth).year(), dayjs(selectedMonth).month());

    let query = supabase.from("work_records").select("*, jobs(job_name, color)").eq("user_id", session.user.id).gte("date", reportStartDate.format("YYYY-MM-DD")).lte("date", reportEndDate.format("YYYY-MM-DD"));

    if (selectedJobFilterId !== "all") {
      query = query.eq("job_id", selectedJobFilterId);
    }

    const { data, error } = await query.order("date", { ascending: true });

    if (error) {
      console.error("Error fetching monthly work records:", error);
      setMonthlyRecords([]);
    } else {
      const allFetchedRecords = data || [];
      setCachedReport(monthStr, selectedJobFilterId, allFetchedRecords);
      setMonthlyRecords(allFetchedRecords);
    }
  }, [session, selectedMonth, selectedJobFilterId, getCachedReport, setCachedReport]);

	useEffect(() => {
		if (isOpen && selectedMonth && session) {
			fetchMonthlyRecords()
		}
	}, [isOpen, selectedMonth, session, fetchMonthlyRecords, selectedJobFilterId])

  // 🎯 계산 로직을 monthlyRecords가 아닌 필터링된 recordsForSelectedMonth 기준으로 실행
	useEffect(() => {
    if (monthlyRecords.length > 0) {
      // 시급 정보는 모든 기록에 대해 조회
      fetchHourlyRates(monthlyRecords).then(() => {
        // 월간 요약은 필터링된 기록으로 계산
        calculateMonthlySummary(recordsForSelectedMonth);
        
        // 주휴수당은 필터링되지 않은 전체 기록으로 계산
        const weeklyAllowanceResult = calculateMonthlyWeeklyAllowance(monthlyRecords, jobs, selectedMonth);
        setWeeklyAllowanceSummary(weeklyAllowanceResult);
      });
    }
  }, [monthlyRecords, recordsForSelectedMonth, jobs, selectedMonth, fetchHourlyRates, calculateMonthlySummary]);


	if (!showModal) return null

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} z-layer-modal`}>
			<div className={`bg-cream-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-2xl dark:shadow-black/50 p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}>
				<div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-dark-navy dark:text-white">{dayjs(selectedMonth).format("YYYY년 M월")} 월급 보고서</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium text-medium-gray dark:text-light-gray mb-1">직업 필터</label>
					<div className="mt-1 flex flex-wrap gap-2">
						<button onClick={() => setSelectedJobFilterId("all")} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${selectedJobFilterId === "all" ? "bg-mint-green dark:bg-mint-green-dark text-white" : "bg-gray-200 dark:bg-gray-700 text-dark-navy dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"}`}>
							모든 직업
						</button>
						{jobs.map((job) => (
							<button
								key={job.id}
								onClick={() => setSelectedJobFilterId(job.id)}
								className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 transform`}
								style={getJobChipStyle(job, selectedJobFilterId === job.id)}
							>
								{job.job_name}
							</button>
						))}
					</div>
				</div>

				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
					<div className="flex justify-between items-center mb-2">
						<p className="text-dark-navy dark:text-white text-sm font-semibold">총 근무 시간</p>
						<p className="text-dark-navy dark:text-white text-base">{formatTotalHours(totalWorkHours)}</p>
					</div>
					<div className="flex justify-between items-center mb-2">
						<p className="text-dark-navy dark:text-white text-sm font-semibold">총 식대</p>
						<p className="text-dark-navy dark:text-white text-base">{(totalMealAllowance || 0).toLocaleString()}원</p>
					</div>
					{/* 🎯 이토스 디자인: 휴게시간 통계 추가 */}
					{totalBreakMinutes > 0 && (
						<div className="space-y-2 mb-2">
							<div className="flex justify-between items-center">
								<p className="text-dark-navy dark:text-white text-sm font-semibold">총 휴게시간</p>
								<p className="text-dark-navy dark:text-white text-base">{formatBreakTime(totalBreakMinutes)}</p>
							</div>
							{totalWageDifference > 0 && (
								<div className="flex justify-between items-center">
									<p className="text-orange-600 dark:text-orange-400 text-sm font-semibold">휴게시간 차감</p>
									<p className="text-orange-600 dark:text-orange-400 text-base">-{totalWageDifference.toLocaleString()}원</p>
								</div>
							)}
						</div>
					)}
					<div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
						<p className="text-dark-navy dark:text-white text-lg font-bold">총 수입</p>
						<p className="text-xl font-extrabold text-mint-green dark:text-mint-green-light whitespace-nowrap">
							{((totalGrossIncome || 0) + (weeklyAllowanceSummary.totalAllowance || 0)).toLocaleString()}원
						</p>
					</div>
					
					{/* 🎯 주휴수당 포함 안내 */}
					{weeklyAllowanceSummary.totalAllowance > 0 && (
						<>
							<div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
								<span>기본 급여 + 주휴수당</span>
								<span>
									{(totalGrossIncome || 0).toLocaleString()}원 + {weeklyAllowanceSummary.totalAllowance.toLocaleString()}원
								</span>
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
								<p>참고: 월 경계를 포함하는 주의 주휴수당은</p>
								<p>해당 주가 끝나는 달의 급여에 합산됩니다.</p>
							</div>
						</>
					)}
				</div>

				{/* 🎯 Etos 디자인: 직업별 휴게시간 차감 요약 */}
				{(() => {
					// 직업별 휴게시간 차감 요약 계산
					const jobBreakdownMap = new Map()
					
					recordsForSelectedMonth.forEach(record => {
						if (record.wage_type === "hourly" && record.start_time && record.end_time && record.jobs) {
							const jobId = record.job_id
							const jobName = record.jobs.job_name || "알 수 없는 직업"
							const jobColor = record.jobs.color || "#6B7280"
							
							if (!jobBreakdownMap.has(jobId)) {
								jobBreakdownMap.set(jobId, {
									jobName,
									jobColor,
									totalWageDifference: 0,
									totalBreakMinutes: 0,
									recordCount: 0
								})
							}
							
							const breakdown = jobBreakdownMap.get(jobId)
							const actualHourlyRate = hourlyRatesMap.get(record.id) || 0
							
							if (actualHourlyRate > 0) {
								const wageDiff = calculateBreakTimeWageDifference(
									record.start_time, record.end_time, record.jobs, actualHourlyRate
								)
								const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
								
								breakdown.totalWageDifference += wageDiff.wageDifference
								breakdown.totalBreakMinutes += workAndBreakTime.breakTime.breakMinutes
								breakdown.recordCount += 1
							}
						}
					})
					
					const jobBreakdowns = Array.from(jobBreakdownMap.values()).filter(b => b.totalWageDifference > 0)
					
					return jobBreakdowns.length > 0 && (
						<div className="mb-6">
							<h3 className="text-lg font-semibold text-dark-navy dark:text-white mb-3 flex items-center">
								<TrendingDown className="w-5 h-5 mr-2 text-orange-500" />
								직업별 휴게시간 차감 내역
							</h3>
							<div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 space-y-3">
								{jobBreakdowns.map(breakdown => (
									<div key={breakdown.jobName} className="flex justify-between items-center">
										<div className="flex items-center gap-2">
											<div 
												className="w-3 h-3 rounded-full"
												style={{ backgroundColor: breakdown.jobColor }}
											></div>
											<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
												{breakdown.jobName}
											</span>
											<span className="text-xs text-gray-500 dark:text-gray-400">
												({breakdown.recordCount}일, {formatBreakTime(breakdown.totalBreakMinutes)})
											</span>
										</div>
										<span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
											-{breakdown.totalWageDifference.toLocaleString()}원
										</span>
									</div>
								))}
								<div className="pt-2 border-t border-orange-300 dark:border-orange-700">
									<div className="flex justify-between items-center">
										<span className="text-sm font-semibold text-orange-700 dark:text-orange-300">총 휴게시간 차감</span>
										<span className="text-base font-bold text-orange-600 dark:text-orange-400">
											-{totalWageDifference.toLocaleString()}원
										</span>
									</div>
								</div>
							</div>
						</div>
					)
				})()}

				{/* 🎯 Etos 디자인: 주휴수당 요약 */}
				{weeklyAllowanceSummary.totalAllowance > 0 && (
					<div className="mb-6">
						<h3 className="text-lg font-semibold text-dark-navy dark:text-white mb-3 flex items-center">
							<Target className="w-5 h-5 mr-2 text-mint-green" />
							주휴수당 요약
						</h3>
						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
							{/* 주차별 주휴수당 상세 */}
							{weeklyAllowanceSummary.eligibleWeekDetails.map(weekDetail => (
								<div key={weekDetail.weekStart} className="rounded-lg border p-3 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 mb-2 last:mb-0">
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium text-gray-800 dark:text-gray-200">
												{formatWeekRange(weekDetail.weekStart, selectedMonth)}
											</span>
										</div>
										<div className="text-right">
											<span className="text-sm font-semibold text-green-600 dark:text-green-400">
												+{weekDetail.totalAllowance.toLocaleString()}원
											</span>
										</div>
									</div>
									<div className="space-y-1">
										{weekDetail.jobAllowances.map(jobAllowance => (
											<div key={jobAllowance.jobName} className="flex items-center justify-between text-xs">
												<div className="flex items-center gap-1.5">
													<div className="w-2 h-2 rounded-full" style={{ backgroundColor: jobAllowance.jobColor }}></div>
													<span className="text-gray-600 dark:text-gray-400">{jobAllowance.jobName}</span>
													<span className="text-gray-500 dark:text-gray-500">{jobAllowance.totalWorkHours.toFixed(1)}h</span>
												</div>
												<div className="text-right">
													<span className="text-green-600 dark:text-green-400 font-medium">
														+{jobAllowance.allowanceAmount.toLocaleString()}원
													</span>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
							
							{/* 총합 */}
							<div className="pt-2 border-t border-green-300 dark:border-green-700">
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold text-green-700 dark:text-green-300">총 주휴수당</span>
										<span className="text-xs text-gray-500 dark:text-gray-400">
											({weeklyAllowanceSummary.eligibleWeeks}/{weeklyAllowanceSummary.totalWeeks}주 지급)
										</span>
									</div>
									<span className="text-base font-bold text-green-600 dark:text-green-400">
										+{weeklyAllowanceSummary.totalAllowance.toLocaleString()}원
									</span>
								</div>
								{/* 무단결근으로 인한 제외 안내 */}
								{(weeklyAllowanceSummary.totalWeeks - weeklyAllowanceSummary.eligibleWeeks) > 0 && (
									<div className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
										<span>⚠️</span>
										<span>
											{weeklyAllowanceSummary.totalWeeks - weeklyAllowanceSummary.eligibleWeeks}주가 
											무단결근 또는 근무시간 부족으로 주휴수당에서 제외되었습니다
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				<h3 className="text-lg font-semibold text-dark-navy dark:text-white mb-3 flex items-center">
					<FileText className="w-5 h-5 mr-2 text-mint-green" />
					일별 상세 내역
				</h3>
				<div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-2">
					{recordsForSelectedMonth.length === 0 ? (
						<p className="text-medium-gray dark:text-light-gray text-center py-4">기록된 내역이 없습니다.</p>
					) : (
						recordsForSelectedMonth.map((record) => (
							<div key={record.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 mb-3 last:mb-0">
								{/* Top Row: Date (Left) and Daily Wage (Right, Emphasized) */}
								<div className="flex justify-between items-center mb-2">
									<p className="text-sm font-medium text-dark-navy dark:text-white">
										{dayjs(record.date).format('M월 D일 (ddd)')}
									</p>
									<p className="text-xl font-extrabold text-mint-green dark:text-mint-green-light whitespace-nowrap flex-shrink-0">
										+{recalculateWageWithBreakTime(record).toLocaleString()}원
									</p>
								</div>

								{/* 🎯 Etos 디자인: 휴게시간 상세 정보 */}
								{record.wage_type === "hourly" && record.start_time && record.end_time && record.jobs && (() => {
									const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
									const actualHourlyRate = hourlyRatesMap.get(record.id) || 0
									
									if (workAndBreakTime.breakTime.breakMinutes === 0) return null
									
									const wageDiff = actualHourlyRate > 0 ? calculateBreakTimeWageDifference(
										record.start_time, record.end_time, record.jobs, actualHourlyRate
									) : { wageDifference: 0, breakTimePaid: 0 }
									
									return (
										<div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
											<div className="flex justify-between items-center text-xs">
																							<div className="flex items-center gap-2">
												<Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
												<span className="text-blue-700 dark:text-blue-300">
													휴게시간 {formatBreakTime(workAndBreakTime.breakTime.breakMinutes)}
												</span>
													{actualHourlyRate > 0 && (
														<span className="text-gray-500 dark:text-gray-400">
															(시급 {actualHourlyRate.toLocaleString()}원)
														</span>
													)}
												</div>
												{actualHourlyRate > 0 && (
													<span className={`font-medium ${
														workAndBreakTime.breakTime.isPaid 
															? "text-green-600 dark:text-green-400" 
															: "text-orange-600 dark:text-orange-400"
													}`}>
														{workAndBreakTime.breakTime.isPaid 
															? `+${wageDiff.breakTimePaid.toLocaleString()}원 포함`
															: `-${wageDiff.wageDifference.toLocaleString()}원 차감`
														}
													</span>
												)}
											</div>
										</div>
									)
								})()}

								{/* Work Details (Time, Duration, Meal Allowance) or Absence */}
								<div className="text-xs text-medium-gray dark:text-light-gray mb-1">
									{record.is_unexcused_absence ? (
										/* 무단결근 표시 */
										<div className="flex items-center gap-1 text-red-600 dark:text-red-400">
											<span>⚠️ 무단결근</span>
											<span className="text-xs text-gray-500 dark:text-gray-400">(주휴수당 제외)</span>
										</div>
									) : (
										<>
											{/* Start ~ End Time and Work Duration */}
											{(record.start_time && record.end_time) && (
												<p>
													{record.start_time?.slice(0, 5) || '--:--'} ~ {record.end_time?.slice(0, 5) || '--:--'}
													<span className="ml-2">({formatDuration(record.start_time, record.end_time)})</span>
												</p>
											)}
											{/* Meal Allowance (only if > 0) */}
											{(record.meal_allowance || 0) > 0 && (
												<p>식대: {(record.meal_allowance || 0).toLocaleString()}원</p>
											)}
										</>
									)}
								</div>

								{/* Bottom Row: Job Title (Colored Chip) */}
								{record.jobs?.job_name && (
									<div>
										<span
											className="inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1"
                      style={getJobChipStyle(record.jobs, true)}
                    >
                      {record.jobs.job_name}
                    </span>
                  </div>
                )}
              </div>
            ))
					)}
				</div>

				<div className="mt-6 text-center">
					<button onClick={onClose} className="px-6 py-3 bg-mint-green text-white rounded-full hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 text-lg font-semibold transition-all duration-200 ease-in-out transform hover:scale-105">
						닫기
					</button>
				</div>
			</div>
		</div>
	)
}

export default MonthlyReportModal
