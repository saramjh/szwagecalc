import React, { useState, useEffect, useCallback } from "react"
import moment from "moment"
import "moment/locale/ko" // 한국어 로케일 임포트
import { supabase } from "../supabaseClient"

moment.locale('ko'); // moment.js 로케일 설정

const getContrastingTextColor = (hexColor) => {
	if (!hexColor) return "#000000";
	const r = parseInt(hexColor.slice(1, 3), 16);
	const g = parseInt(hexColor.slice(3, 5), 16);
	const b = parseInt(hexColor.slice(5, 7), 16);
	const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
	return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

const MonthlyReportModal = ({ isOpen, onClose, selectedMonth, session, jobs }) => {
	const [monthlyRecords, setMonthlyRecords] = useState([])
	const [totalWorkHours, setTotalWorkHours] = useState(0)
	const [totalMealAllowance, setTotalMealAllowance] = useState(0)
	const [totalGrossIncome, setTotalGrossIncome] = useState(0)
	const [selectedJobFilterId, setSelectedJobFilterId] = useState("all") // 선택된 직업 필터 ID 상태 ('all' 또는 job.id)

	const [showModal, setShowModal] = useState(false) // 모달의 실제 렌더링 여부
	const [animateModal, setAnimateModal] = useState(false) // 애니메이션 클래스 적용 여부

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

	const calculateMonthlySummary = useCallback((records) => {
		let totalIncome = 0
		let totalHours = 0
		let totalMeal = 0

		records.forEach((record) => {
			totalIncome += record.daily_wage || 0
			totalMeal += record.meal_allowance || 0

			if (record.start_time && record.end_time) {
				const start = moment(record.start_time, "HH:mm")
				const end = moment(record.end_time, "HH:mm")
				let duration = moment.duration(end.diff(start))
				if (end.isBefore(start)) {
					duration = moment.duration(end.add(1, "day").diff(start))
				}
				totalHours += duration.asHours()
			}
		})

		setTotalGrossIncome(totalIncome);
    setTotalWorkHours(totalHours);
    setTotalMealAllowance(totalMeal);
  }, []);

  const formatDuration = (start_time, end_time) => {
    if (!start_time || !end_time) return '0시간 0분';

    const start = moment(start_time, "HH:mm");
    const end = moment(end_time, "HH:mm");
    let duration = moment.duration(end.diff(start));

    if (end.isBefore(start)) {
        duration = moment.duration(end.add(1, "day").diff(start));
    }

    const hours = Math.floor(duration.asHours());
    const minutes = duration.minutes();

    let formatted = '';
    if (hours > 0) {
        formatted += `${hours}시간 `;
    }
    formatted += `${minutes}분`;

    return formatted.trim();
};

  const formatTotalHours = (totalHours) => {
    if (totalHours === 0) return '0시간 0분';

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
		if (!session) return

		const startOfMonth = moment(selectedMonth).startOf("month").format("YYYY-MM-DD")
		const endOfMonth = moment(selectedMonth).endOf("month").format("YYYY-MM-DD")

		let query = supabase.from("work_records").select("*, jobs(job_name, color)").eq("user_id", session.user.id).gte("date", startOfMonth).lte("date", endOfMonth)

		if (selectedJobFilterId !== "all") {
			query = query.eq("job_id", selectedJobFilterId)
		}

		const { data, error } = await query.order("date", { ascending: true })

		if (error) {
			console.error("Error fetching monthly work records:", error)
			setMonthlyRecords([])
		} else {
			setMonthlyRecords(data || [])
			calculateMonthlySummary(data || [])
		}
	}, [session, selectedMonth, selectedJobFilterId, calculateMonthlySummary])

	useEffect(() => {
		if (isOpen && selectedMonth && session) {
			fetchMonthlyRecords()
		}
	}, [isOpen, selectedMonth, session, fetchMonthlyRecords])

	if (!showModal) return null

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
			<div className={`bg-cream-white dark:bg-charcoal-gray rounded-2xl shadow-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">{moment(selectedMonth).format("YYYY년 M월")} 월급 보고서</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium text-medium-gray dark:text-light-gray mb-1">직업 필터</label>
					<div className="mt-1 flex flex-wrap gap-2">
						<button onClick={() => setSelectedJobFilterId("all")} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${selectedJobFilterId === "all" ? "bg-mint-green text-white" : "bg-gray-200 text-dark-navy dark:bg-gray-700 dark:text-white"}`}>
							모든 직업
						</button>
						{jobs.map((job) => (
							<button
								key={job.id}
								onClick={() => setSelectedJobFilterId(job.id)}
								className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200`}
								style={{
									backgroundColor: selectedJobFilterId === job.id ? (job.color || "#E5E7EB") : (job.color ? job.color + "33" : "#E5E7EB"),
									color: selectedJobFilterId === job.id ? getContrastingTextColor(job.color) : (job.color ? getContrastingTextColor(job.color) : "#1F2937"),
								}}
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
						<p className="text-dark-navy dark:text-white text-base">{totalMealAllowance.toLocaleString()}원</p>
					</div>
					<div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
						<p className="text-dark-navy dark:text-white text-lg font-bold">총 수입</p>
												<p className="text-xl font-extrabold text-mint-green dark:text-mint-green-light whitespace-nowrap">{totalGrossIncome.toLocaleString()}원</p>
					</div>
				</div>

				<h3 className="text-lg font-semibold text-dark-navy dark:text-white mb-3">일별 상세 내역</h3>
				<div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
					{monthlyRecords.length === 0 ? (
						<p className="text-medium-gray dark:text-light-gray text-center py-4">기록된 내역이 없습니다.</p>
					) : (
						            monthlyRecords.map((record) => (
              <div key={record.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 mb-3 last:mb-0">
                {/* Top Row: Date (Left) and Daily Wage (Right, Emphasized) */}
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-dark-navy dark:text-white">
                    {/* 날짜 형식 변경: YYYY년 M월 D일 (ddd) -> M월 D일 (ddd) */}
                    {moment(record.date).format('M월 D일 (ddd)')}
                  </p>
                  <p className="text-xl font-extrabold text-mint-green dark:text-mint-green-light whitespace-nowrap flex-shrink-0">
                    +{record.daily_wage.toLocaleString()}원
                  </p>
                </div>

                {/* Bottom Section: Work Details (Time, Duration, Meal Allowance) */}
                <div className="text-xs text-medium-gray dark:text-light-gray mb-1">
                  {/* Start ~ End Time and Work Duration */}
                  {(record.start_time && record.end_time) && (
                    <p>
                      {record.start_time.slice(0, 5)} ~ {record.end_time.slice(0, 5)}
                      <span className="ml-2">({formatDuration(record.start_time, record.end_time)})</span>
                    </p>
                  )}
                  {/* Meal Allowance (only if > 0) */}
                  {record.meal_allowance > 0 && (
                    <p>식대: {record.meal_allowance.toLocaleString()}원</p>
                  )}
                </div>

                {/* Bottom Row: Job Title (Colored Chip) */}
                {record.jobs?.job_name && (
                  <div>
                    <span
                      className="inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1"
                      style={{ 
                        backgroundColor: record.jobs?.color || "#E5E7EB",
                        color: record.jobs?.color ? getContrastingTextColor(record.jobs.color) : "#1F2937"
                      }}
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
					<button onClick={onClose} className="px-6 py-3 bg-mint-green text-white rounded-full font-medium hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 text-lg font-semibold transition-all duration-200 ease-in-out transform hover:scale-105">
						닫기
					</button>
				</div>
			</div>
		</div>
	)
}

export default MonthlyReportModal
