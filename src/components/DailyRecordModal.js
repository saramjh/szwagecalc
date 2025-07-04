import React, { useState, useEffect, useCallback } from "react"
import moment from "moment"
import { supabase } from "../supabaseClient" // Supabase 클라이언트 임포트
import { useToast } from "../contexts/ToastContext"
import { useConfirm } from "../contexts/ConfirmContext"
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

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
			if (recordToEdit) {
				setRecordId(recordToEdit.id);
				setSelectedJobId(recordToEdit.job_id);
				setStartTime(recordToEdit.start_time);
				setEndTime(recordToEdit.end_time);
				setMealAllowance(recordToEdit.meal_allowance);
				setNotes(recordToEdit.notes);
				setDailyWage(recordToEdit.daily_wage);
			} else {
				resetForm();
			}
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => setShowModal(false), 300) // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
			resetForm();
		}
	}, [isOpen, recordToEdit, resetForm]);

	// 선택된 직업 또는 날짜가 변경될 때 해당 시점의 시급을 가져오는 useEffect
	useEffect(() => {
		const fetchHourlyRateForDate = async () => {
			if (!session || !selectedJobId || !selectedDate) {
				setHourlyRateForDate(0);
				return;
			}

			const { data, error } = await supabase
				.from('hourly_rate_history')
				.select('hourly_rate')
				.eq('user_id', session.user.id)
				.eq('job_id', selectedJobId)
				.lte('effective_date', moment(selectedDate).format('YYYY-MM-DD'))
				.or(`end_date.gte.${moment(selectedDate).format('YYYY-MM-DD')},end_date.is.null`)
				.order('effective_date', { ascending: false })
				.limit(1);

			if (error) {
				console.error('Error fetching hourly rate for date:', error);
				setHourlyRateForDate(0);
			} else if (data && data.length > 0) {
				setHourlyRateForDate(data[0].hourly_rate);
			} else {
				setHourlyRateForDate(0);
			}
		};

		fetchHourlyRateForDate();
	}, [session, selectedJobId, selectedDate]);

	// 시간 또는 시급이 변경될 때 일급을 계산하는 useEffect
	useEffect(() => {
		if (startTime && endTime && hourlyRateForDate !== 0) {
			const startMoment = moment(startTime, "HH:mm");
			const endMoment = moment(endTime, "HH:mm");

			if (endMoment.isBefore(startMoment)) {
				setTimeError(true);
				setDailyWage(0);
				return;
			}
			setTimeError(false);

			const duration = moment.duration(endMoment.diff(startMoment));
			const hours = duration.asHours();
			const calculatedWage = Math.round(hours * hourlyRateForDate);
			setDailyWage(calculatedWage);
		} else {
			setDailyWage(0);
		}
	}, [startTime, endTime, hourlyRateForDate]);

	const handleSave = async () => {
		if (!session || !selectedJobId || !selectedDate || !startTime || !endTime) {
			showToast("모든 필수 항목을 입력해주세요 (직업, 날짜, 출퇴근 시간).", "error");
			return;
		}

		// 시간 유효성 검사
		const startMoment = moment(startTime, "HH:mm");
		const endMoment = moment(endTime, "HH:mm");

		if (endMoment.isBefore(startMoment)) {
			showToast("퇴근 시간은 출근 시간보다 늦어야 합니다.", "error");
			return;
		}

		// 일급 계산 (hourlyRateForDate 사용)
		const duration = moment.duration(endMoment.diff(startMoment));
		const hours = duration.asHours();
		const calculatedDailyWage = Math.round(hours * hourlyRateForDate) + mealAllowance;

		const newRecord = {
			user_id: session.user.id,
			job_id: selectedJobId,
			date: moment(selectedDate).format("YYYY-MM-DD"),
			start_time: startTime,
			end_time: endTime,
			meal_allowance: mealAllowance,
			notes: notes,
			daily_wage: calculatedDailyWage,
		};

		try {
			if (recordId) {
				// 기존 기록 업데이트
				const { error } = await supabase.from("work_records").update(newRecord).eq("id", recordId);
				if (error) throw error;
				showToast("근무 기록이 성공적으로 업데이트되었습니다.", "success");
			} else {
				// 새 기록 삽입
				const { error } = await supabase.from("work_records").insert([newRecord]);
				if (error) throw error;
				showToast("근무 기록이 성공적으로 저장되었습니다.", "success");
			}
			onClose();
			resetForm();
		} catch (error) {
			console.error("근무 기록 저장 오류:", error);
			showToast("근무 기록 저장 중 오류가 발생했습니다: " + error.message, "error");
		}
	};

	const handleDelete = async () => {
		const confirmed = await showConfirm("정말로 이 근무 기록을 삭제하시겠습니까?")
		if (!confirmed) return

		if (!recordId) {
			showToast("삭제할 기록이 없습니다.", "error")
			return
		}

		try {
			const { error } = await supabase.from("work_records").delete().eq("id", recordId)

			if (error) {
				throw error
			}

			showToast("근무 기록이 성공적으로 삭제되었습니다.", "success")
			onClose() // 모달 닫기
			resetForm() // 폼 초기화
		} catch (error) {
			console.error("근무 기록 삭제 오류:", error)
			showToast("근무 기록 삭제 중 오류가 발생했습니다: " + error.message, "error")
		}
	}

	if (!showModal) return null

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${animateModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
			<div className={`bg-cream-white dark:bg-charcoal-gray rounded-2xl shadow-lg p-6 w-full max-w-md transform transition-all duration-300 ease-out ${animateModal ? 'translate-y-0' : 'translate-y-10'}`}>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">{moment(selectedDate).format("YYYY년 M월 D일 (ddd)")} 기록</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>

				<div className="space-y-4">
					<div>
						<label htmlFor="jobSelect" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							직업 선택
						</label>
						<select
							id="jobSelect"
							value={selectedJobId || ""}
							onChange={(e) => setSelectedJobId(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white">
							{jobs.length === 0 && <option value="">직업을 추가해주세요</option>}
							{jobs.map((job) => (
								<option key={job.id} value={job.id}>
									{job.job_name}
								</option>
							))}
						</select>
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
					<div>
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
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
						/>
					</div>
					<div>
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
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
						/>
						{timeError && (
							<p className="text-coral-pink text-sm mt-1">퇴근 시간은 출근 시간보다 늦어야 합니다.</p>
						)}
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
						<button
							onClick={onClose}
							className="px-4 py-2 bg-medium-gray text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out
     transform hover:scale-105">
							취소
						</button>
						<button
							onClick={resetForm}
							className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-all duration-200 
     ease-in-out transform hover:scale-105">
							초기화
						</button>
						<button
							onClick={handleSave}
							className="px-4 py-2 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 
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
