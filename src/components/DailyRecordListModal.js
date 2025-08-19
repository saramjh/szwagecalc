import React, { useState, useEffect, useCallback, useMemo } from "react"
import dayjs from "dayjs"
import { parseHHmm } from "../utils/time"
import { calculateWorkAndBreakTime, formatBreakTime, calculateBreakTimeWageDifference } from "../utils/breakTime"
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
			document.body.classList.add("modal-open") // 모달이 열릴 때 body 스크롤 잠금
			fetchDailyRecords()
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => {
				setShowModal(false) // DOM에서 제거
				setHourlyRatesMap(new Map()) // 시급 맵 초기화
			}, 300) // 애니메이션 완료 후
			document.body.classList.remove("modal-open") // 모달이 닫힐 때 body 스크롤 잠금 해제
		}
	}, [isOpen, fetchDailyRecords])

	// 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
	useEffect(() => {
		return () => {
			document.body.classList.remove("modal-open")
		}
	}, [])

	// 💰 실제 지급 일급 (휴게시간 차감된 금액)
	const actualDailyWage = useMemo(() => {
		return dailyRecords.reduce((total, record) => total + (record.daily_wage || 0), 0)
	}, [dailyRecords])

	// 💡 기본 예상 일급 (휴게시간 포함 최대 가능 급여)
	const maxPossibleWage = useMemo(() => {
		return dailyRecords.reduce((total, record) => {
			// 일급제는 저장된 값 그대로 사용
			if (record.wage_type === "daily") {
				return total + (record.daily_wage || 0)
			}
			
			// 시급제는 총 근무시간 × 시급으로 계산
			if (record.start_time && record.end_time && record.jobs) {
				const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
				
				// 🎯 실제 설정된 시급 사용
				const actualHourlyRate = hourlyRatesMap.get(record.id) || 0
				
				// 최대 가능 급여 = 총 시간 × 시급
				const maxWage = Math.round(workAndBreakTime.totalHours * actualHourlyRate) + (record.meal_allowance || 0)
				return total + maxWage
			}
			
			// 기본값: 저장된 값 사용
			return total + (record.daily_wage || 0)
		}, 0)
	}, [dailyRecords, hourlyRatesMap])

	// 총 휴게시간 계산
	const totalBreakTime = useMemo(() => {
		let totalBreakMinutes = 0
		
		dailyRecords.forEach(record => {
			if (record.start_time && record.end_time && record.jobs) {
				const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
				totalBreakMinutes += workAndBreakTime.breakTime.breakMinutes
			}
		})
		
		return totalBreakMinutes
	}, [dailyRecords])

	// 💸 총 차액 (최대 가능 급여 - 실제 지급 급여)
	const totalWageLoss = maxPossibleWage - actualDailyWage

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

	// 무단결근 처리 함수
	const handleAbsenceToggle = async (isChecked) => {
		if (!session || !selectedDate) return
		
		const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD")
		
		if (isChecked) {
			// 무단결근 기록 생성
			const { error } = await supabase
				.from("work_records")
				.insert({
					user_id: session.user.id,
					date: formattedDate,
					start_time: null,
					end_time: null,
					daily_wage: 0,
					notes: "무단결근",
					wage_type: "daily",
					work_description: "무단결근",
					is_unexcused_absence: true,
					job_id: null
				})

			if (error) {
				console.error("Error creating absence record:", error)
				showToast("무단결근 기록에 실패했어요", "error")
			} else {
				showToast("무단결근으로 기록했어요", "success")
				fetchDailyRecords()
				try { window.dispatchEvent(new Event('work-records-changed')) } catch (_) {}
			}
		} else {
			// 무단결근 기록 삭제
			const { error } = await supabase
				.from("work_records")
				.delete()
				.eq("user_id", session.user.id)
				.eq("date", formattedDate)
				.eq("is_unexcused_absence", true)

			if (error) {
				console.error("Error removing absence record:", error)
				showToast("무단결근 해제에 실패했어요", "error")
			} else {
				showToast("무단결근을 해제했어요", "success")
				fetchDailyRecords()
				try { window.dispatchEvent(new Event('work-records-changed')) } catch (_) {}
			}
		}
	}

	if (!showModal) return null

	return (
		<>
			<div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} z-layer-modal`}>
				<div className={`bg-cream-white dark:bg-charcoal-gray rounded-2xl shadow-lg p-6 w-full max-w-md transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}>
					<div className="flex justify-between items-start mb-4">
						<div className="flex-1">
                            <h2 className="text-xl font-bold text-dark-navy dark:text-white">
                            	{selectedDate && dayjs(selectedDate).isValid() 
                            		? dayjs(selectedDate).format("YYYY년 M월 D일 (ddd)") 
                            		: "날짜 선택"
                            	}
                            </h2>
                            
                            {/* 무단결근 체크박스 - 근무기록이 없을 때만 표시 */}
                            {dailyRecords.length === 0 && (
                            	<div className="mt-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                            		<div className="flex items-start gap-3">
                            			<div className="flex items-center">
                            				<input
                            					type="checkbox"
                            					id="dayAbsence"
                            					className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            					onChange={(e) => handleAbsenceToggle(e.target.checked)}
                            				/>
                            			</div>
                            			<div className="flex-1">
                            				<label htmlFor="dayAbsence" className="text-sm font-medium text-orange-800 dark:text-orange-200 cursor-pointer">
                            					⚠️ 무단결근
                            				</label>
                            				<p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                            					무단결근으로 체크하면 해당 주의 주휴수당이 지급되지 않습니다
                            				</p>
                            			</div>
                            		</div>
                            	</div>
                            )}
						</div>
						<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105 ml-4">
							&times;
						</button>
					</div>

					<div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
						{dailyRecords.length === 0 ? (
							<p className="text-medium-gray dark:text-light-gray text-center py-4">기록된 근무가 없습니다. 지금 바로 첫 근무를 추가해보세요!</p>
						) : (
							dailyRecords.map((record) => (
								<div key={record.id} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0 rounded-md">
									{/* 정보 섹션 */}
									<div className="flex-grow cursor-pointer p-2 -m-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors duration-150" onClick={() => handleEditRecord(record)}>
										{record.jobs?.job_name && (
											<span 
												className="inline-block px-2 py-1 rounded-full text-xs font-medium self-start mb-1"
												style={getJobChipStyle(record.jobs, true)}
											>
												{record.jobs.job_name}
											</span>
										)}
										{/* 🎯 실시간 급여 재계산 (휴게시간 정책 반영) */}
										<p className="text-lg font-bold text-dark-navy dark:text-white">
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
										</p>
										<p className="text-sm text-medium-gray dark:text-light-gray">
											{record.start_time?.slice(0, 5) || '--:--'} ~ {record.end_time?.slice(0, 5) || '--:--'}
										</p>
										<p className="text-sm text-medium-gray dark:text-light-gray">({formatDuration(record.start_time, record.end_time)})</p>
										
										{/* 🎯 Etos 디자인: 휴게시간 정보 - 명확하고 일관성 있는 표시 */}
										{(() => {
											if (!record.start_time || !record.end_time || !record.jobs) return null
											const workAndBreakTime = calculateWorkAndBreakTime(record.start_time, record.end_time, record.jobs)
											const actualHourlyRate = hourlyRatesMap.get(record.id) || 0
											
											if (workAndBreakTime.breakTime.breakMinutes === 0) return null
											
											const wageDiff = actualHourlyRate > 0 ? calculateBreakTimeWageDifference(
												record.start_time, record.end_time, record.jobs, actualHourlyRate
											) : { wageDifference: 0, breakTimePaid: 0 }
											
											return (
												<div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
													{/* 상단: 휴게시간 기본 정보 */}
													<div className="flex justify-between items-center mb-1">
														<div className="flex items-center gap-2">
															<span className="text-blue-600 dark:text-blue-400">⏰</span>
															<span className="text-sm font-medium text-blue-700 dark:text-blue-300">
																휴게시간 {formatBreakTime(workAndBreakTime.breakTime.breakMinutes)}
															</span>
															<span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
																workAndBreakTime.breakTime.isPaid 
																	? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
																	: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
															}`}>
																{workAndBreakTime.breakTime.isPaid ? "유급" : "무급"}
															</span>
														</div>
													</div>
													
													{/* 하단: 시급 정보 및 차액 */}
													{actualHourlyRate > 0 && (
														<div className="flex justify-between items-center text-xs">
															<span className="text-gray-600 dark:text-gray-400">
																시급 {actualHourlyRate.toLocaleString()}원
															</span>
															<span className={`font-semibold ${
																workAndBreakTime.breakTime.isPaid 
																	? "text-green-600 dark:text-green-400" 
																	: "text-orange-600 dark:text-orange-400"
															}`}>
																{workAndBreakTime.breakTime.isPaid 
																	? `+${wageDiff.breakTimePaid.toLocaleString()}원 포함`
																	: `-${wageDiff.wageDifference.toLocaleString()}원 차감`
																}
															</span>
														</div>
													)}
													
													{/* 시급 정보가 없는 경우 */}
													{actualHourlyRate === 0 && (
														<div className="text-xs text-gray-500 dark:text-gray-400">
															시급 정보 없음 (차액 계산 불가)
														</div>
													)}
												</div>
											)
										})()}
										
										{(record.meal_allowance || 0) > 0 && <p className="text-sm text-medium-gray dark:text-light-gray">식대: {(record.meal_allowance || 0).toLocaleString()}원</p>}
										{record.notes && <p className="text-sm text-medium-gray dark:text-light-gray">비고: {record.notes}</p>}
									</div>
									{/* 버튼 섹션 */}
									<div className="flex flex-col space-y-2 ml-4">
										<button onClick={() => handleEditRecord(record)} className="p-2 rounded-full text-medium-gray dark:text-light-gray hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200" aria-label="편집">
											<PencilIcon size={20} />
										</button>
										<button onClick={() => handleDeleteRecord(record.id)} className="p-2 rounded-full text-coral-pink hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200" aria-label="삭제">
											<Trash2Icon size={20} />
										</button>
									</div>
								</div>
							))
						)}
					</div>

                    <div className="mt-6 flex flex-col justify-between items-center p-4 bg-cream-white dark:bg-charcoal-gray border-t border-gray-200 dark:border-gray-700 rounded-b-2xl -mx-6 -mb-6 space-y-3">
                        {actualDailyWage > 0 && (
                        	<div className="text-center space-y-1 mb-4">
                        		{maxPossibleWage > actualDailyWage ? (
                        			<>
                        				<p className="text-sm text-gray-600 dark:text-gray-400">기본 예상: {maxPossibleWage.toLocaleString()}원</p>
                        				<p className="text-lg font-semibold text-mint-green dark:text-mint-green-light">실제 일급: {actualDailyWage.toLocaleString()}원</p>
                        				<p className="text-sm text-orange-600 dark:text-orange-400">💸 휴게시간 차감: -{totalWageLoss.toLocaleString()}원</p>
                        			</>
                        		) : (
                        			<p className="text-lg font-semibold text-mint-green dark:text-mint-green-light">총 일급: {actualDailyWage.toLocaleString()}원</p>
                        		)}
                        		                        {totalBreakTime > 0 && (
                        	<div className="text-sm space-y-1">
                        		<p className="text-blue-600 dark:text-blue-400">
                        			🕐 총 휴게시간: {formatBreakTime(totalBreakTime)}
                        		</p>
                        		{/* 총합에서는 이미 위에 차액 표시되므로 제거 */}
                        	</div>
                        )}
                        	</div>
                        )}
                        <div className="flex flex-col gap-3 w-full">
							<button
								onClick={handleAddRecord}
                                className="px-3 py-2 bg-mint-green text-white rounded-full font-medium hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2 w-full">
								<PlusIcon size={25} className="font-black" />
							</button>
                            <button onClick={onClose} className="px-3 py-2 bg-medium-gray text-white rounded-full font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105 w-full">
								닫기
							</button>
						</div>
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
