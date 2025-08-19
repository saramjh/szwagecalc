import React, { useState, useEffect, useCallback } from "react"
import dayjs from "dayjs"
import { parseHHmm } from "../utils/time"
import { calculateWorkAndBreakTime, formatBreakTime } from "../utils/breakTime"
import { useModalManager } from "../utils/modalManager"
import { supabase } from "../supabaseClient"
import DailyRecordModal from "./DailyRecordModal"
import { useConfirm } from "../contexts/ConfirmContext"
import { useToast } from "../contexts/ToastContext"
// 🚀 트리셰이킹 최적화: 개별 import
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react"
import { getJobChipStyle } from "../constants/JobColors"

const formatDuration = (start_time, end_time) => {
	if (!start_time || !end_time) return "0시간 0분"

    const start = parseHHmm(start_time)
    let end = parseHHmm(end_time)
    if (!start || !end) return "0시간 0분"

	if (end.isBefore(start)) {
        end = end.add(1, "day")
	}

    const minutesTotal = end.diff(start, "minute")
    const hours = Math.floor(minutesTotal / 60)
    const minutes = minutesTotal % 60

	let formatted = ""
	if (hours > 0) {
		formatted += `${hours}시간 `
	}
	formatted += `${minutes}분`

	return formatted.trim()
}

const DailyRecordListModal = ({ selectedDate, isOpen, onClose, session, jobs }) => {
	const showConfirm = useConfirm()
	const showToast = useToast()
	const { openModal, closeModal } = useModalManager()
	const [dailyRecords, setDailyRecords] = useState([])
	const [isDailyRecordModalOpen, setIsDailyRecordModalOpen] = useState(false)
	const [selectedRecordForEdit, setSelectedRecordForEdit] = useState(null) // 편집할 기록


	const [showModal, setShowModal] = useState(false) // 모달의 실제 렌더링 여부
	const [animateModal, setAnimateModal] = useState(false) // 애니메이션 클래스 적용 여부

	const fetchDailyRecords = useCallback(async () => {
		if (!session || !selectedDate) return

        const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD")
		const { data, error } = await supabase
			.from("work_records")
			.select("*, jobs(job_name, color, break_time_enabled, break_time_paid, break_time_policies)") 
			.eq("date", formattedDate)
			.eq("user_id", session.user.id)
			.order("start_time", { ascending: true })

		if (error) {
			console.error("Error fetching daily records:", error)
		} else {
			setDailyRecords(data)
		}
	}, [session, selectedDate])

	// 🎯 각 기록별 실제 시급을 저장할 Map
	const [hourlyRatesMap, setHourlyRatesMap] = useState(new Map())

	// 시급 정보 일괄 조회
	const fetchHourlyRates = useCallback(async () => {
		if (!session || !dailyRecords.length || !selectedDate) return

		const ratesMap = new Map()
		const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD")
		
		// 날짜가 유효하지 않으면 조회하지 않음
		if (formattedDate === "Invalid date" || !dayjs(selectedDate).isValid()) {
			console.warn("Invalid selectedDate:", selectedDate)
			return
		}

		// 각 기록별로 시급 조회
		for (const record of dailyRecords) {
			if (record.wage_type === "hourly" && record.job_id) {
				const { data, error } = await supabase
					.from("hourly_rate_history")
					.select("hourly_rate")
					.eq("job_id", record.job_id)
					.eq("user_id", session.user.id)
					.lte("effective_date", formattedDate)
					.or("end_date.is.null,end_date.gte." + formattedDate)
					.order("effective_date", { ascending: false })
					.limit(1)

				if (!error && data?.[0]) {
					ratesMap.set(record.id, data[0].hourly_rate)
				}
			}
		}

		setHourlyRatesMap(ratesMap)
	}, [session, dailyRecords, selectedDate])

	// dailyRecords가 변경될 때마다 시급 정보 조회 (모달이 열려있을 때만)
	useEffect(() => {
		if (isOpen && dailyRecords.length > 0) {
			fetchHourlyRates()
		}
	}, [fetchHourlyRates, isOpen, dailyRecords.length])

	useEffect(() => {
		if (isOpen) {
			setShowModal(true) // 모달을 DOM에 렌더링 시작
			setTimeout(() => setAnimateModal(true), 10) // 약간의 지연 후 애니메이션 시작
			openModal() // 🎯 모달 매니저로 헤더 숨김 관리
			fetchDailyRecords()
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => {
				setShowModal(false) // DOM에서 제거
				setHourlyRatesMap(new Map()) // 시급 맵 초기화
			}, 300) // 애니메이션 완료 후
			closeModal() // 🎯 모달 매니저로 헤더 복원 관리
		}
	}, [isOpen, fetchDailyRecords, openModal, closeModal])

	// 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
	useEffect(() => {
		return () => {
			closeModal() // 🎯 모달 매니저로 정리
		}
	}, [closeModal])





	const handleAddRecord = () => {
		setSelectedRecordForEdit(null) // 새 기록 추가 모드
		setIsDailyRecordModalOpen(true)
	}

	const handleEditRecord = (record) => {
		setSelectedRecordForEdit(record) // 기존 기록 편집 모드
		setIsDailyRecordModalOpen(true)
	}

	const handleDeleteRecord = async (recordId) => {
		if (!session) return

		showConfirm("정말 삭제하시겠어요?", async () => {
			const { error } = await supabase.from("work_records").delete().eq("id", recordId).eq("user_id", session.user.id)

			if (error) {
				console.error("Error deleting record:", error)
				showToast("삭제하지 못했어요", "error")
			} else {
                
				showToast("삭제했어요", "success")
				fetchDailyRecords() // 목록 새로고침
			}
		})
	}

	const handleDailyRecordModalClose = () => {
		setIsDailyRecordModalOpen(false)
		setSelectedRecordForEdit(null)
		fetchDailyRecords() // 기록 저장/삭제 후 목록 새로고침
		try { window.dispatchEvent(new Event('work-records-changed')) } catch (_) {}
	}

	// 직업별 무단결근 처리 함수
	const handleJobAbsenceToggle = async (jobId, isChecked) => {
		if (!session || !selectedDate || !jobId) return
		
		const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD")
		const selectedJob = jobs.find(job => job.id === jobId)
		
		if (isChecked) {
			// 특정 직업에 대한 무단결근 기록 생성
			const { error } = await supabase
				.from("work_records")
				.insert({
					user_id: session.user.id,
					job_id: jobId,
					date: formattedDate,
					start_time: null,
					end_time: null,
					daily_wage: 0,
					meal_allowance: 0,
					notes: `${selectedJob?.job_name || '직업'} 무단결근`,
					wage_type: "daily",
					work_description: "무단결근",
					is_unexcused_absence: true
				})

			if (error) {
				console.error("Error creating absence record:", error)
				showToast("무단결근 기록에 실패했어요", "error")
			} else {
				showToast(`${selectedJob?.job_name || '직업'} 무단결근으로 기록했어요`, "success")
				fetchDailyRecords()
				try { window.dispatchEvent(new Event('work-records-changed')) } catch (_) {}
			}
		} else {
			// 특정 직업의 무단결근 기록 삭제
			const { error } = await supabase
				.from("work_records")
				.delete()
				.eq("user_id", session.user.id)
				.eq("job_id", jobId)
				.eq("date", formattedDate)
				.eq("is_unexcused_absence", true)

			if (error) {
				console.error("Error removing absence record:", error)
				showToast("무단결근 해제에 실패했어요", "error")
			} else {
				showToast(`${selectedJob?.job_name || '직업'} 무단결근을 해제했어요`, "success")
				fetchDailyRecords()
				try { window.dispatchEvent(new Event('work-records-changed')) } catch (_) {}
			}
		}
	}

	if (!showModal) return null

	return (
		<>
			<div className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} z-layer-modal`}>
				<div className={`bg-cream-white dark:bg-gray-900 rounded-2xl shadow-lg dark:shadow-2xl dark:shadow-black/50 w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}>
					{/* 헤더 */}
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-xl font-bold text-dark-navy dark:text-white">
							{selectedDate && dayjs(selectedDate).isValid() 
								? dayjs(selectedDate).format("YYYY년 M월 D일 (ddd)") 
								: "날짜 선택"
							}
						</h2>
						<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
							&times;
						</button>
					</div>
                            
					{/* 직업별 주휴수당 현황 */}
					{jobs && jobs.length > 0 && (
						<div className="mb-6">
							<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
								직업별 주휴수당 적용 현황
							</h3>
                            		<div className="grid grid-cols-1 gap-2">
                            			{jobs.map(job => {
                            				const isAbsent = dailyRecords.some(record => 
                            					record.job_id === job.id && record.is_unexcused_absence
                            				)
                            				const hasNormalRecord = dailyRecords.some(record => 
                            					record.job_id === job.id && !record.is_unexcused_absence
                            				)
                            				
                            				return (
                            					<div key={job.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            						{/* 상단: 직업명과 상태 */}
                            						<div className="flex items-center justify-between mb-2">
                            							<div className="flex items-center gap-2 flex-1 min-w-0">
                            								<div 
                            									className="w-3 h-3 rounded-full flex-shrink-0"
                            									style={{ backgroundColor: job.color || '#6B7280' }}
                            								></div>
                            								<span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                            									{job.job_name}
                            								</span>
                            								{hasNormalRecord && (
                            									<span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                            										근무
                            									</span>
                            								)}
                            							</div>
                            						</div>
                            						
                            						{/* 하단: 무단결근 체크박스와 주휴수당 상태 */}
                            						<div className="flex items-center justify-between">
                            							<div className="flex items-center gap-2">
                            								{!hasNormalRecord && (
                            									<label className="flex items-center gap-1.5 cursor-pointer">
                            										<input
                            											type="checkbox"
                            											checked={isAbsent}
                            											className="w-3.5 h-3.5 text-gray-600 bg-gray-100 border-gray-300 rounded focus:ring-gray-500 dark:focus:ring-gray-600 dark:ring-offset-gray-800 focus:ring-1 dark:bg-gray-700 dark:border-gray-600"
                            											onChange={(e) => handleJobAbsenceToggle(job.id, e.target.checked)}
                            										/>
                            										<span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            											무단결근
                            										</span>
                            									</label>
                            								)}
                            							</div>
                            							
                            							{/* 주휴수당 상태 */}
                            							<div className="flex-shrink-0">
                            								{job.weekly_allowance_enabled ? (
                            									isAbsent ? (
                            										<span className="text-xs text-red-500 dark:text-red-400 whitespace-nowrap">주휴수당 ✕</span>
                            									) : (
                            										<span className="text-xs text-blue-500 dark:text-blue-400 whitespace-nowrap">주휴수당 ○</span>
                            									)
                            								) : (
                            									<span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">주휴수당 미적용</span>
                            								)}
                            							</div>
                            						</div>
                            					</div>
                            				)
                            			})}
                            		</div>
                            		{/* 간단한 안내 메시지 */}
                            		{jobs.some(job => job.weekly_allowance_enabled) && (
                            			<p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            				무단결근 시 해당 직업의 주휴수당이 제외됩니다
                            			</p>
							)}
						</div>
					)}

					{/* 근무 기록 목록 */}
					<div className="space-y-6">
						{dailyRecords.length === 0 ? (
							<div className="text-center py-12">
								<p className="text-medium-gray dark:text-light-gray text-lg">기록된 근무가 없습니다.</p>
								<p className="text-sm text-medium-gray dark:text-light-gray mt-2">지금 바로 첫 근무를 추가해보세요!</p>
							</div>
						) : (
							dailyRecords.map((record) => (
								<div key={record.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
									<div className="flex justify-between items-start mb-3">
										{/* 직업 정보 */}
										<div className="flex-1">
											{record.jobs?.job_name && (
												<span 
													className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-2"
													style={getJobChipStyle(record.jobs, true)}
												>
													{record.jobs.job_name}
												</span>
											)}
											{/* 일급 표시 */}
											<div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
												+{(() => {
													// 일급제는 저장된 값 그대로 사용
													if (record.wage_type === "daily") {
														return (record.daily_wage || 0).toLocaleString()
													}
													
													// 시급제: 실제 시급으로 휴게시간 정책을 반영하여 재계산
													if (record.start_time && record.end_time && record.jobs) {
														const actualHourlyRate = hourlyRatesMap.get(record.id) || 0
														if (actualHourlyRate > 0) {
															const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
															
															// 급여 대상 시간 계산 (휴게시간 정책 반영)
															let payableHours = workAndBreakTime.workHours
															if (workAndBreakTime.breakTime.isPaid) {
																payableHours = workAndBreakTime.totalHours
															}
															
															const recalculatedWage = Math.round(payableHours * actualHourlyRate) + (record.meal_allowance || 0)
															return recalculatedWage.toLocaleString()
														}
													}
													
													// 기본값: 저장된 값 사용
													return (record.daily_wage || 0).toLocaleString()
												})()}원
											</div>
											
											{/* 근무 시간 */}
											<div className="text-gray-600 dark:text-gray-400 space-y-1">
												<p className="text-base">
													{record.start_time?.slice(0, 5) || '--:--'} ~ {record.end_time?.slice(0, 5) || '--:--'}
												</p>
												<p className="text-sm">총 {formatDuration(record.start_time, record.end_time)}</p>
												
												{/* 휴게시간 정보 (있을 때만 표시) */}
												{(() => {
													if (!record.start_time || !record.end_time || !record.jobs) return null
													const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
													if (workAndBreakTime.breakTime.breakMinutes === 0) return null
													
													return (
														<p className="text-sm text-blue-600 dark:text-blue-400">
															⏰ 휴게시간 {formatBreakTime(workAndBreakTime.breakTime.breakMinutes)} 
															<span className={`ml-1 text-xs ${workAndBreakTime.breakTime.isPaid ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
																({workAndBreakTime.breakTime.isPaid ? '유급' : '무급'})
															</span>
														</p>
													)
												})()}
											</div>
										</div>
										
										{/* 액션 버튼 */}
										<div className="flex space-x-2">
											<button
												onClick={() => handleEditRecord(record)}
												className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
											>
												<PencilIcon size={16} />
											</button>
											<button
												onClick={() => handleDeleteRecord(record.id)}
												className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
											>
												<Trash2Icon size={16} />
											</button>
										</div>
									</div>
										
									
									{/* 추가 정보 */}
									{((record.meal_allowance || 0) > 0 || record.notes) && (
										<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
											{(record.meal_allowance || 0) > 0 && (
												<p className="text-sm text-gray-600 dark:text-gray-400">
													💰 식대: {(record.meal_allowance || 0).toLocaleString()}원
												</p>
											)}
											{record.notes && (
												<p className="text-sm text-gray-600 dark:text-gray-400">
													📝 {record.notes}
												</p>
											)}
										</div>
									)}
									</div>
							))
						)}
					</div>

					{/* 일급 총합 정보 */}
					{dailyRecords.length > 0 && (
						<div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
							<h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">📊 오늘의 급여 요약</h3>
							
							{(() => {
								// 기준 예상 금액 (휴게시간 포함 최대 가능)
								const maxPossibleWage = dailyRecords.reduce((total, record) => {
									if (record.wage_type === "daily") {
										return total + (record.daily_wage || 0)
									}
									
									if (record.start_time && record.end_time && record.jobs) {
										const actualHourlyRate = hourlyRatesMap.get(record.id) || 0
										if (actualHourlyRate > 0) {
											const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
											// 휴게시간 포함 최대 시간으로 계산
											const maxHours = workAndBreakTime.totalHours
											return total + Math.round(maxHours * actualHourlyRate) + (record.meal_allowance || 0)
										}
									}
									
									return total + (record.daily_wage || 0)
								}, 0)
								
								// 실제 받은 금액
								const actualDailyWage = dailyRecords.reduce((total, record) => total + (record.daily_wage || 0), 0)
								
								// 휴게시간으로 차감된 금액
								const wageLoss = maxPossibleWage - actualDailyWage
								
								// 총 휴게시간
								const totalBreakTime = dailyRecords.reduce((total, record) => {
									if (!record.start_time || !record.end_time || !record.jobs) return total
									const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
									return total + workAndBreakTime.breakTime.breakMinutes
								}, 0)
								
								return (
									<div className="space-y-2">
										{maxPossibleWage > actualDailyWage ? (
											<>
												<div className="flex justify-between items-center">
													<span className="text-sm text-gray-600 dark:text-gray-400">기준 예상 급여:</span>
													<span className="font-medium text-gray-700 dark:text-gray-300">{maxPossibleWage.toLocaleString()}원</span>
												</div>
												<div className="flex justify-between items-center">
													<span className="text-sm text-green-700 dark:text-green-400">실제 받는 급여:</span>
													<span className="font-bold text-green-700 dark:text-green-400 text-lg">{actualDailyWage.toLocaleString()}원</span>
												</div>
												<div className="flex justify-between items-center">
													<span className="text-sm text-orange-600 dark:text-orange-400">휴게시간 차감:</span>
													<span className="font-medium text-orange-600 dark:text-orange-400">-{wageLoss.toLocaleString()}원</span>
												</div>
											</>
										) : (
											<div className="flex justify-between items-center">
												<span className="text-sm text-green-700 dark:text-green-400">총 급여:</span>
												<span className="font-bold text-green-700 dark:text-green-400 text-lg">{actualDailyWage.toLocaleString()}원</span>
											</div>
										)}
										
										{totalBreakTime > 0 && (
											<div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-700">
												<span className="text-sm text-blue-600 dark:text-blue-400">총 휴게시간:</span>
												<span className="font-medium text-blue-600 dark:text-blue-400">{formatBreakTime(totalBreakTime)}</span>
											</div>
										)}
									</div>
								)
							})()}
						</div>
					)}

					{/* 액션 버튼 */}
					<div className="mt-6 flex gap-3">
						<button
							onClick={handleAddRecord}
							className="flex-1 bg-mint-green dark:bg-mint-green-dark text-white py-3 px-4 rounded-xl font-medium hover:bg-mint-green-dark dark:hover:bg-mint-green transition-all duration-200 flex items-center justify-center gap-2"
						>
							<PlusIcon size={20} />
							근무 추가
						</button>
						<button
							onClick={onClose}
							className="flex-1 bg-gray-400 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
						>
							닫기
						</button>
					</div>
				</div>
			</div>
			{isDailyRecordModalOpen && (
				<DailyRecordModal
					selectedDate={selectedDate}
					isOpen={isDailyRecordModalOpen}
					onClose={handleDailyRecordModalClose}
					session={session}
					jobs={jobs}
					recordToEdit={selectedRecordForEdit} // 편집할 기록 전달
					size="large" // DailyRecordModal을 'large' 크기로 열도록 지정
				/>
			)}
		</>
	)
}

export default DailyRecordListModal
