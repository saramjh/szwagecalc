import React, { useState, useEffect, useCallback } from "react"
import moment from "moment"
import { supabase } from "../supabaseClient" // Supabase 클라이언트 임포트
import { useToast } from "../contexts/ToastContext"
import { useConfirm } from "../contexts/ConfirmContext"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const getContrastingTextColor = (hexColor) => {
	if (!hexColor) return "#000000"; // 기본값으로 검은색 반환
	const r = parseInt(hexColor.slice(1, 3), 16);
	const g = parseInt(hexColor.slice(3, 5), 16);
	const b = parseInt(hexColor.slice(5, 7), 16);
	const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
	return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

const DailyRecordModal = ({ selectedDate, isOpen, onClose, session, jobs, recordToEdit }) => {
	const showToast = useToast()
	const showConfirm = useConfirm()
	const [startTime, setStartTime] = useState("")
	const [endTime, setEndTime] = useState("")
	const [mealAllowance, setMealAllowance] = useState(0)
	const [notes, setNotes] = useState("")
	const [dailyWage, setDailyWage] = useState(0)
	const [recordId, setRecordId] = useState(null)
	const [hourlyRateForDate, setHourlyRateForDate] = useState(0)
	const [timeError, setTimeError] = useState(false)
	const [selectedJobId, setSelectedJobId] = useState(null) // 선택된 직업 ID 상태

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
		if (jobs.length > 0) {
			setSelectedJobId(jobs[0].id) // 초기화 시 첫 번째 직업으로 설정
		}
	}, [jobs])

	useEffect(() => {
		if (isOpen) {
			setShowModal(true) // 모달을 DOM에 렌더링 시작
			setTimeout(() => setAnimateModal(true), 10) // 약간의 지연 후 애니메이션 시작
			document.body.classList.add("modal-open") // 모달이 열릴 때 body 스크롤 잠금
			if (recordToEdit) {
				setRecordId(recordToEdit.id)
				setSelectedJobId(recordToEdit.job_id)
				setStartTime(recordToEdit.start_time)
				setEndTime(recordToEdit.end_time)
				setMealAllowance(recordToEdit.meal_allowance)
				setNotes(recordToEdit.notes)
				setDailyWage(recordToEdit.daily_wage)
			} else {
				resetForm()
			}
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => setShowModal(false), 300) // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
			document.body.classList.remove("modal-open") // 모달이 닫힐 때 body 스크롤 잠금 해제
			resetForm()
		}
	}, [isOpen, recordToEdit, resetForm])

	// 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
	useEffect(() => {
		return () => {
			document.body.classList.remove("modal-open")
		}
	}, [])

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
				.lte("effective_date", moment(selectedDate).format("YYYY-MM-DD"))
				.or(`end_date.gte.${moment(selectedDate).format("YYYY-MM-DD")},end_date.is.null`)
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

	// 시간 또는 시급이 변경될 때 일급을 계산하는 useEffect
	useEffect(() => {
		if (startTime && endTime && hourlyRateForDate !== 0) {
			const startMoment = moment(startTime, "HH:mm")
			const endMoment = moment(endTime, "HH:mm")

			if (endMoment.isBefore(startMoment)) {
				setTimeError(true)
				setDailyWage(0)
				return
			}
			setTimeError(false)

			const duration = moment.duration(endMoment.diff(startMoment))
			const hours = duration.asHours()
			const calculatedWage = Math.round(hours * hourlyRateForDate) + mealAllowance
			setDailyWage(calculatedWage)
		} else {
			setDailyWage(0)
		}
	}, [startTime, endTime, hourlyRateForDate, mealAllowance])

	const handleSave = async () => {
		if (!session || !selectedJobId || !selectedDate || !startTime || !endTime) {
			showToast("시간을 입력해주세요.", "error")
			return
		}

		// 시급 유효성 검사: 시급이 0이면 저장 방지 및 안내
		if (hourlyRateForDate === 0) {
			showToast("해당 직업의 시급을 설정해주세요.", "error")
			return // 저장 방지
		}

		// 시급 유효성 검사: 시급이 0이면 저장 방지 및 안내
		if (hourlyRateForDate === 0) {
			showToast("해당 직업의 시급을 설정해주세요.", "error")
			return // 저장 방지
		}

		// 시간 유효성 검사
		const startMoment = moment(startTime, "HH:mm")
		const endMoment = moment(endTime, "HH:mm")

		if (endMoment.isBefore(startMoment)) {
			showToast("퇴근 시간을 다시 확인해주세요.", "error")
			return
		}

		// 일급 계산 (hourlyRateForDate 사용)
		const duration = moment.duration(endMoment.diff(startMoment))
		const hours = duration.asHours()
		const calculatedDailyWage = Math.round(hours * hourlyRateForDate) + mealAllowance

		const newRecord = {
			user_id: session.user.id,
			job_id: selectedJobId,
			date: moment(selectedDate).format("YYYY-MM-DD"),
			start_time: startTime,
			end_time: endTime,
			meal_allowance: mealAllowance,
			notes: notes,
			daily_wage: calculatedDailyWage,
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
	const size = "medium"
	const modalSizeClass = {
		small: "sm:max-w-md",
		medium: "sm:max-w-xl",
		large: "sm:max-w-3xl",
		full: "sm:max-w-full",
	}[size]

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} overflow-y-auto p-4`}>
			<div className={`bg-cream-white dark:bg-charcoal-gray rounded-2xl shadow-lg p-6 w-full ${modalSizeClass} transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"} my-auto`}>
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
										className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200`}
										style={{ 
					backgroundColor: selectedJobId === job.id ? (job.color || "#E5E7EB") : (job.color ? job.color + "33" : "#E5E7EB"), 
					color: selectedJobId === job.id ? getContrastingTextColor(job.color) : (job.color ? getContrastingTextColor(job.color) : "#1F2937")
				}}>
										{job.job_name}
									</button>
								))
							)}
						</div>
					</div>
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
					<div className="flex gap-4">
						<div className="flex-1">
							<label htmlFor="startTime" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
								출근 시간
							</label>
							<DatePicker
								id="startTime"
								selected={startTime ? moment(startTime, "HH:mm").toDate() : null}
								onChange={(date) => setStartTime(moment(date).format("HH:mm"))}
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
								selected={endTime ? moment(endTime, "HH:mm").toDate() : null}
								onChange={(date) => setEndTime(moment(date).format("HH:mm"))}
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
					<div></div>
					<div>
						<label htmlFor="mealAllowance" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							식대 (원)
						</label>
						<input
							type="number"
							id="mealAllowance"
							value={mealAllowance}
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
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-white dark:bg-charcoal-gray text-dark-navy dark:text-white"></textarea>
					</div>
				</div>

				<div className="mt-6 text-right text-lg font-semibold text-mint-green">예상 일급: {dailyWage.toLocaleString()}원</div>

				<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
					{recordId && (
						<button onClick={handleDelete} className="w-full sm:w-auto px-6 py-3 text-white bg-coral-pink rounded-full font-medium hover:bg-coral-pink-dark focus:outline-none focus:ring-2 focus:ring-coral-pink focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
							삭제
						</button>
					)}
					<div className="flex flex-col gap-3 sm:flex-row sm:ml-auto">
						<button onClick={onClose} className="w-full sm:w-auto px-3 py-2 bg-medium-gray text-white rounded-full font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
							취소
						</button>
						<button
							onClick={resetForm}
							className="w-full sm:w-auto px-3 py-2 bg-gray-200 text-dark-navy rounded-full font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-opacity-50 transition-all duration-200 
     ease-in-out transform hover:scale-105 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
							초기화
						</button>
						<button
							onClick={handleSave}
							className="w-full sm:w-auto px-3 py-2 bg-mint-green text-white rounded-full font-medium hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 
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
