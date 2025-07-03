import React, { useState, useEffect } from "react"
import moment from "moment"
import { supabase } from "../supabaseClient" // Supabase 클라이언트 임포트

const DailyRecordModal = ({ selectedDate, isOpen, onClose, onSave, hourlyRate, session }) => {
	const [startTime, setStartTime] = useState("")
	const [endTime, setEndTime] = useState("")
	const [mealAllowance, setMealAllowance] = useState(0)
	const [notes, setNotes] = useState("")
	const [dailyWage, setDailyWage] = useState(0)
	const [recordId, setRecordId] = useState(null) // Add state for record ID
	const [hourlyRateForDate, setHourlyRateForDate] = useState(hourlyRate) // 해당 날짜의 시급 상태
	const [timeError, setTimeError] = useState(false) // 시간 유효성 검사 오류 상태

	const fetchRecord = async () => {
		if (!session) return // 세션이 없으면 아무것도 하지 않음

		const formattedDate = moment(selectedDate).format("YYYY-MM-DD")

		// 해당 날짜에 유효한 시급 조회
		const { data: rateData, error: rateError } = await supabase.from("hourly_rate_history").select("hourly_rate").eq("user_id", session.user.id).lte("effective_date", formattedDate).or(`end_date.gte.${formattedDate},end_date.is.null`).order("effective_date", { ascending: false }).limit(1).single()

		if (rateError && rateError.code !== "PGRST116") {
			console.error(`Error fetching hourly rate for ${formattedDate}:`, rateError)
			setHourlyRateForDate(hourlyRate) // 오류 발생 시 현재 시급 사용
		} else if (rateData) {
			setHourlyRateForDate(rateData.hourly_rate)
		} else {
			setHourlyRateForDate(hourlyRate) // 시급 정보가 없으면 현재 시급 사용
		}

		const { data, error } = await supabase.from("work_records").select("*").eq("date", formattedDate).eq("user_id", session.user.id).single()

		if (error && error.code !== "PGRST116") {
			console.error("Error fetching single work record:", error)
		} else if (data) {
			setStartTime(data.start_time || "")
			setEndTime(data.end_time || "")
			setMealAllowance(data.meal_allowance || 0)
			setNotes(data.notes || "")
			setRecordId(data.id)
		} else {
			setStartTime("")
			setEndTime("")
			setMealAllowance(0)
			setNotes("")
			setRecordId(null)
		}
	}

	const handleSave = async () => {
		if (!session) return // 세션이 없으면 저장하지 않음
		if (timeError) {
			// 시간 오류가 있으면 저장 방지
			alert("퇴근 시간은 출근 시간보다 빠를 수 없습니다.")
			return
		}

		const formattedDate = moment(selectedDate).format("YYYY-MM-DD")
		const recordToSave = {
			date: formattedDate,
			start_time: startTime,
			end_time: endTime,
			meal_allowance: Number(mealAllowance),
			notes,
			daily_wage: dailyWage,
			user_id: session.user.id, // user_id 추가
		}

		if (recordId) {
			// 기존 레코드 업데이트
			const { error } = await supabase.from("work_records").update(recordToSave).eq("id", recordId).eq("user_id", session.user.id) // user_id로 필터링

			if (error) {
				console.error("Error updating work record:", error)
			} else {
				console.log("Work record updated:", recordToSave)
				onSave(recordToSave)
				onClose()
			}
		} else {
			// 새 레코드 삽입
			const { error } = await supabase.from("work_records").insert([recordToSave])

			if (error) {
				console.error("Error inserting work record:", error)
			} else {
				console.log("Work record inserted:", recordToSave)
				onSave(recordToSave)
				onClose()
			}
		}
	}

	const handleDelete = async () => {
		if (!session) return // 세션이 없으면 삭제하지 않음

		if (window.confirm("정말로 이 기록을 삭제하시겠습니까?")) {
			const { error } = await supabase.from("work_records").delete().eq("id", recordId).eq("user_id", session.user.id) // user_id로 필터링

			if (error) {
				console.error("Error deleting work record:", error)
			} else {
				console.log("Work record deleted:", recordId)
				onSave(null) // Indicate deletion to parent component
				onClose()
			}
		}
	}

	useEffect(() => {
		if (isOpen && selectedDate) {
			fetchRecord()
		}
	}, [isOpen, selectedDate, session])

	useEffect(() => {
		// 근무 시간 계산 및 일급 업데이트
		if (startTime && endTime) {
			// selectedDate와 시간을 결합하여 moment 객체 생성
			let startMoment = moment(`${moment(selectedDate).format("YYYY-MM-DD")} ${startTime}`)
			let endMoment = moment(`${moment(selectedDate).format("YYYY-MM-DD")} ${endTime}`)

			// 퇴근 시간이 출근 시간보다 앞서는 경우 (같은 날 기준)
			if (endMoment.isBefore(startMoment)) {
				endMoment.add(1, "day") // 일단 다음 날로 간주하여 시간 차이 계산
			}

			const duration = moment.duration(endMoment.diff(startMoment))
			const hours = duration.asHours()

			if (hours < 0) {
				// 계산된 시간이 음수이면 유효하지 않은 입력
				setTimeError(true)
				setDailyWage(0) // 오류 시 일급 0
				alert("퇴근 시간은 출근 시간보다 빠를 수 없습니다.") // 즉시 경고
				return // 계산 중단
			} else {
				setTimeError(false)
			}

			const calculatedWage = Math.floor(hours * hourlyRateForDate + Number(mealAllowance)) // 소수점 제거
			setDailyWage(calculatedWage)

			console.log("--- Daily Wage Calculation Debug ---")
			console.log("Start Time:", startTime)
			console.log("End Time:", endTime)
			console.log("Hourly Rate For Date:", hourlyRateForDate) // 디버그 로그 변경
			console.log("Meal Allowance:", mealAllowance)
			console.log("Calculated Hours:", hours)
			console.log("Calculated Daily Wage:", calculatedWage)
			console.log("-------------------------------------")
		} else {
			setTimeError(false) // 시간 입력이 없으면 오류 아님
			setDailyWage(Number(mealAllowance))
		}
	}, [startTime, endTime, mealAllowance, hourlyRateForDate, selectedDate])

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ease-out">
			<div className="bg-cream-white dark:bg-charcoal-gray rounded-t-2xl shadow-lg p-6 w-full max-w-md transform transition-transform duration-300 ease-out translate-y-0">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">{moment(selectedDate).format("YYYY년 M월 D일 (ddd)")} 기록</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>

				<div className="space-y-4">
					<div>
						<label htmlFor="startTime" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							출근 시간
						</label>
						<input
							type="time"
							id="startTime"
							value={startTime}
							onChange={(e) => setStartTime(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
						/>
					</div>
					<div>
						<label htmlFor="endTime" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							퇴근 시간
						</label>
						<input
							type="time"
							id="endTime"
							value={endTime}
							onChange={(e) => setEndTime(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
						/>
					</div>
					<div>
						<label htmlFor="mealAllowance" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							식대 (원)
						</label>
						<input
							type="number"
							id="mealAllowance"
							value={mealAllowance}
							onChange={(e) => setMealAllowance(Math.max(0, parseInt(e.target.value) || 0))}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
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
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"></textarea>
					</div>
				</div>

				<div className="mt-6 text-right text-lg font-semibold text-mint-green">예상 일급: {dailyWage.toLocaleString()}원</div>

				<div className="mt-6 flex justify-between items-center">
					{recordId && (
						<button onClick={handleDelete} className="px-4 py-2 text-coral-pink bg-coral-pink-light rounded-lg hover:bg-coral-pink focus:outline-none focus:ring-2 focus:ring-coral-pink focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
							삭제
						</button>
					)}
					<div className="flex space-x-3 ml-auto">
						<button onClick={onClose} className="px-4 py-2 bg-medium-gray text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
							취소
						</button>
						<button onClick={handleSave} className="px-4 py-2 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
							저장
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default DailyRecordModal
