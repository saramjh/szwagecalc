import React, { useState, useEffect, useCallback, useMemo } from "react"
import dayjs from "dayjs"
import { DollarSign } from "lucide-react"
import { parseHHmm } from "../utils/time"
import { useModalManager } from "../utils/modalManager"
import { supabase } from "../supabaseClient" // Supabase 클라이언트 임포트
import { useToast } from "../contexts/ToastContext"
import { useConfirm } from "../contexts/ConfirmContext"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { getJobChipStyle } from "../constants/JobColors"
import { calculateWorkAndBreakTime, formatBreakTime, calculateBreakTimeWageDifference } from "../utils/breakTime"

const DailyRecordModal = ({ selectedDate, isOpen, onClose, session, jobs, recordToEdit, size = "medium", prefill }) => {
	const showToast = useToast()
	const showConfirm = useConfirm()
	const { openModal, closeModal } = useModalManager()
	const [startTime, setStartTime] = useState("")
	const [endTime, setEndTime] = useState("")
	const [mealAllowance, setMealAllowance] = useState(0)
	const [notes, setNotes] = useState("")
	const [dailyWage, setDailyWage] = useState(0)
	const [recordId, setRecordId] = useState(null)
	const [hourlyRateForDate, setHourlyRateForDate] = useState(0)
	const [timeError, setTimeError] = useState(false)
	const [selectedJobId, setSelectedJobId] = useState(null) // 선택된 직업 ID 상태
	const [wageType, setWageType] = useState("hourly") // 급여 방식: "hourly" 또는 "daily"
	const [fixedDailyWage, setFixedDailyWage] = useState(0) // 일급제 직접 입력 금액
	const [breakTimeInfo, setBreakTimeInfo] = useState({ breakMinutes: 0, breakHours: 0, isPaid: false }) // 휴게시간 정보
	const [showRecalculationNotice, setShowRecalculationNotice] = useState(false) // 재계산 안내 표시 여부
	const [breakTimeWageDiff, setBreakTimeWageDiff] = useState({ breakTimePaid: 0, breakTimeUnpaid: 0, wageDifference: 0 }) // 휴게시간 차액 정보


	const [showModal, setShowModal] = useState(false) // 모달의 실제 렌더링 여부
	const [animateModal, setAnimateModal] = useState(false) // 애니메이션 클래스 적용 여부

	const resetForm = useCallback(() => {
		setStartTime("")
		setEndTime("")
		setMealAllowance(0)
		setNotes("")
		setDailyWage(0)
		setRecordId(null)
		setTimeError(false)
		setWageType("hourly")
		setFixedDailyWage(0)
		setSelectedJobId(null)
		setBreakTimeInfo({ breakMinutes: 0, breakHours: 0, isPaid: false })
		setShowRecalculationNotice(false)
		setBreakTimeWageDiff({ breakTimePaid: 0, breakTimeUnpaid: 0, wageDifference: 0 })

	}, [])

	// jobs가 변경될 때만 첫 번째 job으로 설정
	useEffect(() => {
		if (jobs.length > 0 && !selectedJobId) {
			setSelectedJobId(jobs[0].id)
		}
	}, [jobs, selectedJobId])

	useEffect(() => {

		if (isOpen) {
			setShowModal(true) // 모달을 DOM에 렌더링 시작
			setTimeout(() => setAnimateModal(true), 10) // 약간의 지연 후 애니메이션 시작
			openModal() // 🎯 모달 매니저로 헤더 숨김 관리
			
			if (recordToEdit) {
				// 수정 모드: 기존 레코드 데이터로 폼 초기화

				setRecordId(recordToEdit.id)
				setSelectedJobId(recordToEdit.job_id)
				setStartTime(recordToEdit.start_time ? recordToEdit.start_time.slice(0, 5) : "")
				setEndTime(recordToEdit.end_time ? recordToEdit.end_time.slice(0, 5) : "")
				setMealAllowance(recordToEdit.meal_allowance || 0)
				setNotes(recordToEdit.notes || "")
				setDailyWage(recordToEdit.daily_wage || 0)
				setWageType(recordToEdit.wage_type || "hourly")

				if (recordToEdit.wage_type === "daily") {
					setFixedDailyWage(recordToEdit.daily_wage || 0)
				}

			} else {
				// 새 레코드 생성 모드: 폼 초기화 후 프리필 적용

				resetForm()
				if (jobs.length > 0) {
					setSelectedJobId(jobs[0].id) // 초기화 시 첫 번째 직업으로 설정
				}
				// 프리필 값이 있으면 적용
				if (prefill) {
					if (prefill.jobId) setSelectedJobId(prefill.jobId)
					if (prefill.start) setStartTime(prefill.start)
					if (prefill.end) setEndTime(prefill.end)
					if (prefill.wageType) setWageType(prefill.wageType)
				}
			}
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => setShowModal(false), 300) // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
			closeModal() // 🎯 모달 매니저로 헤더 복원 관리
		}
	}, [isOpen, recordToEdit, prefill, jobs, resetForm, openModal, closeModal])

	// 모달이 닫힐 때 폼 리셋 (별도 useEffect로 분리)
	useEffect(() => {
		if (!isOpen) {
			setTimeout(() => {

				resetForm()
			}, 350)
		}
	}, [isOpen, resetForm])

	// 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
	useEffect(() => {
		return () => {
			closeModal() // 🎯 모달 매니저로 정리
		}
	}, [closeModal])

	// 선택된 직업 또는 날짜가 변경될 때 해당 시점의 시급을 가져오는 useEffect
	useEffect(() => {
		const fetchHourlyRateForDate = async () => {
			if (!session || !selectedJobId || !selectedDate) {
				setHourlyRateForDate(0)
				return
			}

			const { data, error } = await supabase
				.from("hourly_rate_history")
				.select("hourly_rate")
				.eq("user_id", session.user.id)
				.eq("job_id", selectedJobId)
                .lte("effective_date", dayjs(selectedDate).format("YYYY-MM-DD"))
                .or(`end_date.gte.${dayjs(selectedDate).format("YYYY-MM-DD")},end_date.is.null`)
				.order("effective_date", { ascending: false })
				.limit(1)

			if (error) {
				console.error("Error fetching hourly rate for date:", error)
				setHourlyRateForDate(0)
			} else if (data && data.length > 0) {
				setHourlyRateForDate(data[0].hourly_rate)
			} else {
				setHourlyRateForDate(0)
			}
		}

		fetchHourlyRateForDate()
	}, [session, selectedJobId, selectedDate])

	// 현재 선택된 직업 정보 메모이제이션
	const currentJob = useMemo(() => {
		return jobs.find(job => job.id === selectedJobId)
	}, [jobs, selectedJobId])

	// 시간 또는 시급이 변경될 때 일급과 휴게시간을 계산하는 useEffect
	useEffect(() => {
		
		if (wageType === "hourly") {
			// 시급제: 시간 기반 계산
			if (startTime && endTime && hourlyRateForDate !== 0) {
                const startMoment = parseHHmm(startTime)
                let endMoment = parseHHmm(endTime)
                if (!startMoment || !endMoment) {
                    setDailyWage(0)
                    setBreakTimeInfo({ breakMinutes: 0, breakHours: 0, isPaid: false })
                    return
                }
                if (endMoment.isBefore(startMoment)) {
                    setTimeError(true)
                    setDailyWage(0)
                    setBreakTimeInfo({ breakMinutes: 0, breakHours: 0, isPaid: false })
                    return
                }
				setTimeError(false)

				// 휴게시간 포함 계산
				const workAndBreakTime = calculateWorkAndBreakTime(startTime, endTime, currentJob)
				setBreakTimeInfo(workAndBreakTime.breakTime)

				// 💰 휴게시간 차액 계산
				const wageDiff = calculateBreakTimeWageDifference(startTime, endTime, currentJob, hourlyRateForDate)
				setBreakTimeWageDiff(wageDiff)

				// 급여 계산 (휴게시간 유급/무급 고려)
				let payableHours = workAndBreakTime.workHours
				if (workAndBreakTime.breakTime.isPaid) {
					payableHours = workAndBreakTime.totalHours // 휴게시간도 급여에 포함
				}
				
				const calculatedWage = Math.round(payableHours * hourlyRateForDate) + mealAllowance
				
				// 편집 모드에서 기존 급여와 새 계산이 다른 경우 안내 표시
				if (recordId && recordToEdit && Math.abs(calculatedWage - (recordToEdit?.daily_wage || 0)) > 100) {
					setShowRecalculationNotice(true)
				} else {
					setShowRecalculationNotice(false)
				}
				
				setDailyWage(calculatedWage)
			} else {
				setDailyWage(0)
				setBreakTimeInfo({ breakMinutes: 0, breakHours: 0, isPaid: false })
				setBreakTimeWageDiff({ breakTimePaid: 0, breakTimeUnpaid: 0, wageDifference: 0 })
			}
		} else if (wageType === "daily") {
			// 일급제: 고정 일급 + 식대
			setTimeError(false)
			setDailyWage(fixedDailyWage + mealAllowance)
			
			// 일급제에서도 휴게시간 정보 표시
			if (startTime && endTime) {
				const workAndBreakTime = calculateWorkAndBreakTime(startTime, endTime, currentJob)
				setBreakTimeInfo(workAndBreakTime.breakTime)
				// 일급제에서는 차액 정보 초기화
				setBreakTimeWageDiff({ breakTimePaid: 0, breakTimeUnpaid: 0, wageDifference: 0 })
			} else {
				setBreakTimeInfo({ breakMinutes: 0, breakHours: 0, isPaid: false })
				setBreakTimeWageDiff({ breakTimePaid: 0, breakTimeUnpaid: 0, wageDifference: 0 })
			}
		}
	}, [wageType, startTime, endTime, hourlyRateForDate, mealAllowance, fixedDailyWage, currentJob, recordId, recordToEdit])

	const handleSave = async () => {
		if (!session || !selectedJobId || !selectedDate) {
			showToast("필수 정보를 입력해주세요.", "error")
			return
		}

		// 급여 방식별 유효성 검사
		if (wageType === "hourly") {
			// 시급제 유효성 검사
			if (!startTime || !endTime) {
				showToast("시간을 입력해주세요.", "error")
				return
			}
			if (hourlyRateForDate === 0) {
				showToast("해당 직업의 시급을 설정해주세요.", "error")
				return
			}
			// 시간 유효성 검사
            const startMoment = parseHHmm(startTime)
            const endMoment = parseHHmm(endTime)
            if (!startMoment || !endMoment) {
                showToast("시간 형식을 확인해주세요.", "error")
                return
            }
			if (endMoment.isBefore(startMoment)) {
				showToast("퇴근 시간을 다시 확인해주세요.", "error")
				return
			}
		} else if (wageType === "daily") {
			// 일급제 유효성 검사
			if (fixedDailyWage <= 0) {
				showToast("일급을 입력해주세요.", "error")
				return
			}
			// 시간 입력 검사 (일급제에서도 근무시간 기록)
			if (!startTime || !endTime) {
				showToast("근무시간을 입력해주세요.", "error")
				return
			}
			// 시간 유효성 검사
            const startMoment = parseHHmm(startTime)
            const endMoment = parseHHmm(endTime)
            if (!startMoment || !endMoment) {
                showToast("시간 형식을 확인해주세요.", "error")
                return
            }
			if (endMoment.isBefore(startMoment)) {
				showToast("퇴근 시간을 다시 확인해주세요.", "error")
				return
			}
		}

		// 급여 방식별 저장 데이터 준비
		let newRecord = {
			user_id: session.user.id,
			job_id: selectedJobId,
            date: dayjs(selectedDate).format("YYYY-MM-DD"),
			meal_allowance: mealAllowance,
			notes: notes,
			wage_type: wageType,
			work_description: notes,

		}

		if (wageType === "hourly") {
			// 시급제: 휴게시간 정책을 고려한 정확한 계산
			const workAndBreakTime = calculateWorkAndBreakTime(startTime, endTime, currentJob)
			
			// 급여 대상 시간 계산 (휴게시간 유급/무급 고려)
			let payableHours = workAndBreakTime.workHours // 기본적으로 실 근무시간
			if (workAndBreakTime.breakTime.isPaid) {
				payableHours = workAndBreakTime.totalHours // 휴게시간도 급여에 포함
			}
			
			const calculatedDailyWage = Math.round(payableHours * hourlyRateForDate) + mealAllowance
			
			newRecord = {
				...newRecord,
				start_time: startTime,
				end_time: endTime,
				daily_wage: calculatedDailyWage,
			}
		} else if (wageType === "daily") {
			// 일급제: 고정 일급 + 식대 (시간도 기록)
			newRecord = {
				...newRecord,
				start_time: startTime,
				end_time: endTime,
				daily_wage: fixedDailyWage + mealAllowance,
			}
		}

		try {
            if (recordId) {
				// 기존 기록 업데이트
				const { error } = await supabase.from("work_records").update(newRecord).eq("id", recordId)
				if (error) throw error
				showToast("수정했어요", "success")
			} else {
				// 새 기록 삽입
				const { error } = await supabase.from("work_records").insert([newRecord])
				if (error) throw error
				showToast("저장했어요", "success")
			}
            // Broadcast change for screens not subscribed or throttled
            try { window.dispatchEvent(new Event('work-records-changed')) } catch (_) {}
            onClose()
            resetForm()
		} catch (error) {
			console.error("근무 기록 저장 오류:", error)
			showToast("저장하지 못했어요", "error")
		}
	}

	const handleDelete = async () => {
		if (!recordId) {
			showToast("삭제할 기록이 없어요", "error")
			return
		}

		showConfirm("정말 삭제하시겠어요?", async () => {
			try {
				const { error } = await supabase.from("work_records").delete().eq("id", recordId)

				if (error) {
					throw error
				}

				showToast("삭제했어요", "success")
				onClose() // 모달 닫기
				resetForm() // 폼 초기화
			} catch (error) {
				console.error("근무 기록 삭제 오류:", error)
				showToast("삭제하지 못했어요", "error")
			}
		})
	}

    if (!showModal) return null
    const modalSizeClass = {
        small: "max-w-md",
        medium: "max-w-xl",
        large: "max-w-3xl",
        full: "max-w-full",
    }[size]

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex justify-center items-center transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} overflow-y-auto p-4 z-layer-modal`}>
			<div className={`bg-cream-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-2xl dark:shadow-black/50 p-6 w-full ${modalSizeClass} transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"} my-auto`}>
				<div className="flex justify-between items-start mb-4">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">{recordToEdit ? "근무 기록 편집" : "새 근무 기록"}</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-medium-gray dark:text-light-gray">직업 선택</label>
						<div className="mt-1 flex flex-wrap gap-2">
							{jobs.length === 0 ? (
								<p className="text-sm text-medium-gray dark:text-light-gray">직업을 추가해주세요</p>
							) : (
								jobs.map((job) => (
									<button
										key={job.id}
										onClick={() => setSelectedJobId(job.id)}
										className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 transform`}
										style={getJobChipStyle(job, selectedJobId === job.id)}>
										{job.job_name}
									</button>
								))
							)}
						</div>
					</div>

					{/* 급여 방식 선택 */}
					<div>
						<label className="block text-sm font-medium text-medium-gray dark:text-light-gray mb-2">급여 방식</label>
						<div className="flex gap-2">
							<button
								onClick={() => setWageType("hourly")}
								className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
									wageType === "hourly" 
										? "bg-mint-green text-white" 
										: "bg-gray-200 text-dark-navy dark:bg-gray-700 dark:text-white"
								}`}
							>
								시급제
							</button>
							<button
								onClick={() => setWageType("daily")}
								className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
									wageType === "daily" 
										? "bg-mint-green text-white" 
										: "bg-gray-200 text-dark-navy dark:bg-gray-700 dark:text-white"
								}`}
							>
								일급제
							</button>
						</div>
					</div>

					{/* 급여 정보 (방식별) */}
					{wageType === "hourly" && (
					<div>
						<label htmlFor="hourlyRateDisplay" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							적용 시급
						</label>
						<input
							type="text"
							id="hourlyRateDisplay"
							value={`${hourlyRateForDate != null ? hourlyRateForDate.toLocaleString() : "0"}원`}
							readOnly
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md 
     bg-gray-100 dark:bg-gray-700 text-dark-navy dark:text-white sm:text-sm"
						/>
					</div>
					)}

					{wageType === "daily" && (
						<div>
							<label htmlFor="fixedDailyWage" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
								일급 (원)
							</label>
							<input
								type="number"
								id="fixedDailyWage"
								value={fixedDailyWage || ""}
								onChange={(e) => setFixedDailyWage(Math.max(0, parseInt(e.target.value) || 0))}
								placeholder="예: 150000"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
							/>
						</div>
					)}

					{/* 근무 시간 (공통) */}
					<div className="flex gap-4">
						<div className="flex-1">
							<label htmlFor="startTime" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
								출근 시간
							</label>
                            <DatePicker
								id="startTime"
                                selected={/^\d{2}:\d{2}$/.test(startTime) ? (parseHHmm(startTime)?.toDate() || null) : null}
                                onChange={(date) => {
                                    if (!date) { setStartTime(""); return }
                                    const d = dayjs(date)
                                    if (!d.isValid()) { setStartTime(""); return }
                                    setStartTime(d.format("HH:mm"))
                                }}
								showTimeSelect
								showTimeSelectOnly
								timeIntervals={15}
								dateFormat="HH:mm"
								timeFormat="HH:mm"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
								inputProps={{ autoComplete: "off" }}
							/>
						</div>
						<div className="flex-1">
							<label htmlFor="endTime" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
								퇴근 시간
							</label>
                            <DatePicker
								id="endTime"
                                selected={/^\d{2}:\d{2}$/.test(endTime) ? (parseHHmm(endTime)?.toDate() || null) : null}
                                onChange={(date) => {
                                    if (!date) { setEndTime(""); return }
                                    const d = dayjs(date)
                                    if (!d.isValid()) { setEndTime(""); return }
                                    setEndTime(d.format("HH:mm"))
                                }}
								showTimeSelect
								showTimeSelectOnly
								timeIntervals={15}
								dateFormat="HH:mm"
								timeFormat="HH:mm"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
								inputProps={{ autoComplete: "off" }}
							/>
						</div>
					</div>
					{timeError && <p className="text-red-500 text-xs mt-1">퇴근 시간은 출근 시간보다 늦어야 해요.</p>}

					{/* 공통 입력 필드: 식대 */}
					<div>
						<label htmlFor="mealAllowance" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							식대 (원)
						</label>
						<input
							type="number"
							id="mealAllowance"
							value={mealAllowance || ""}
							onChange={(e) => setMealAllowance(Math.max(0, parseInt(e.target.value) || 0))}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
						/>
					</div>

					
					<div>
						<label htmlFor="notes" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							비고
						</label>
						<textarea
							id="notes"
							rows="2"
							value={notes || ""}
							onChange={(e) => setNotes(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-white dark:bg-charcoal-gray text-dark-navy dark:text-white"></textarea>
					</div>
				</div>

				<div className="mt-6 text-right text-lg font-semibold text-mint-green">예상 일급: {dailyWage.toLocaleString()}원</div>
				
				{/* 🎯 이토스 디자인: 휴게시간 정보 실시간 표시 */}
				{breakTimeInfo.breakMinutes > 0 && (
					<div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
						<div className="flex justify-between items-center text-sm">
							<span className="text-blue-700 dark:text-blue-300 font-medium">
								📋 예상 휴게시간
							</span>
							<span className="text-blue-800 dark:text-blue-200 font-semibold">
								{formatBreakTime(breakTimeInfo.breakMinutes)}
							</span>
						</div>
						
						{/* 💰 급여 영향 정보 */}
						{wageType === "hourly" && breakTimeInfo.breakMinutes > 0 && (
							<div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
								{breakTimeInfo.isPaid ? (
									<div className="flex justify-between items-center text-xs">
										<span className="text-green-600 dark:text-green-400 flex items-center">
											<DollarSign className="w-3 h-3 mr-1" />
											휴게시간 급여 포함
										</span>
										<span className="text-green-600 dark:text-green-400 font-medium">
											+{breakTimeWageDiff.breakTimePaid.toLocaleString()}원
										</span>
									</div>
								) : (
									<div className="flex justify-between items-center text-xs">
										<span className="text-orange-600 dark:text-orange-400">💸 휴게시간 무급 차감</span>
										<span className="text-orange-600 dark:text-orange-400 font-medium">
											-{breakTimeWageDiff.wageDifference.toLocaleString()}원
										</span>
									</div>
								)}
							</div>
						)}
						
						{wageType === "daily" && (
							<div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
								ℹ️ 일급제는 휴게시간이 급여에 영향 없음
							</div>
						)}
					</div>
				)}
				
				{/* 🎯 이토스 디자인: 재계산 안내 메시지 */}
				{showRecalculationNotice && (
					<div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
						<div className="flex items-start space-x-2">
							<span className="text-amber-600 dark:text-amber-400 text-lg">⚡</span>
							<div className="flex-1">
								<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
									휴게시간 정책 적용으로 급여가 재계산되었습니다
								</p>
								<p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
									기존: {(recordToEdit?.daily_wage || 0).toLocaleString()}원 → 새 계산: {dailyWage.toLocaleString()}원
								</p>
							</div>
						</div>
					</div>
				)}

                <div className="mt-6 flex flex-col-reverse gap-3">
					{recordId && (
                        <button onClick={handleDelete} className="w-full px-6 py-3 text-white bg-coral-pink rounded-full font-medium hover:bg-coral-pink-dark focus:outline-none focus:ring-2 focus:ring-coral-pink focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
							삭제
						</button>
					)}
                    <div className="flex flex-col gap-3">
                        <button onClick={onClose} className="w-full px-3 py-2 bg-medium-gray text-white rounded-full font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
							취소
						</button>
						<button
							onClick={resetForm}
                            className="w-full px-3 py-2 bg-gray-200 text-dark-navy rounded-full font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-50 transition-all duration-200 
     ease-in-out transform hover:scale-105 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
							초기화
						</button>
						<button
							onClick={handleSave}
                            className="w-full px-3 py-2 bg-mint-green text-white rounded-full font-medium hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 
     ease-in-out transform hover:scale-105">
							저장
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default DailyRecordModal
