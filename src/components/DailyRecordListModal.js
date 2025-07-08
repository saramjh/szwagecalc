import React, { useState, useEffect, useCallback, useMemo } from "react"
import moment from "moment"
import { supabase } from "../supabaseClient"
import DailyRecordModal from "./DailyRecordModal"
import { useConfirm } from "../contexts/ConfirmContext"
import { useToast } from "../contexts/ToastContext"
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react"

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

		const formattedDate = moment(selectedDate).format("YYYY-MM-DD")
		const { data, error } = await supabase
			.from("work_records")
			.select("*, jobs(job_name, color)") // job_name과 color도 함께 가져오도록 수정
			.eq("date", formattedDate)
			.eq("user_id", session.user.id)
			.order("start_time", { ascending: true })

		if (error) {
			console.error("Error fetching daily records:", error)
		} else {
			setDailyRecords(data)
		}
	}, [session, selectedDate])

	useEffect(() => {
		if (isOpen) {
			setShowModal(true) // 모달을 DOM에 렌더링 시작
			setTimeout(() => setAnimateModal(true), 10) // 약간의 지연 후 애니메이션 시작
			document.body.classList.add("modal-open") // 모달이 열릴 때 body 스크롤 잠금
			fetchDailyRecords()
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => setShowModal(false), 300) // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
			document.body.classList.remove("modal-open") // 모달이 닫힐 때 body 스크롤 잠금 해제
		}
	}, [isOpen, fetchDailyRecords])

	// 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
	useEffect(() => {
		return () => {
			document.body.classList.remove("modal-open")
		}
	}, [])

	const totalDailyWage = useMemo(() => {
		return dailyRecords.reduce((total, record) => total + record.daily_wage, 0)
	}, [dailyRecords])

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
				console.log("Record deleted:", recordId)
				showToast("삭제했어요", "success")
				fetchDailyRecords() // 목록 새로고침
			}
		})
	}

	const handleDailyRecordModalClose = () => {
		setIsDailyRecordModalOpen(false)
		setSelectedRecordForEdit(null)
		fetchDailyRecords() // 기록 저장/삭제 후 목록 새로고침
	}

	if (!showModal) return null

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
			<div className={`bg-cream-white dark:bg-charcoal-gray rounded-2xl shadow-lg p-6 w-full max-w-md transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}>
				<div className="flex justify-between items-start mb-4">
					<div>
						<h2 className="text-xl font-bold text-dark-navy dark:text-white">{moment(selectedDate).format("YYYY년 M월 D일 (ddd)")}</h2>
					</div>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
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
										<span className="inline-block text-white px-2 py-1 rounded-full text-xs font-medium self-start mb-1" style={{ backgroundColor: record.jobs?.color || "transparent" }}>
											{record.jobs.job_name}
										</span>
									)}
									<p className="text-lg font-bold text-dark-navy dark:text-white">+{record.daily_wage.toLocaleString()}원</p>
									<p className="text-sm text-medium-gray dark:text-light-gray">
										{record.start_time.slice(0, 5)} ~ {record.end_time.slice(0, 5)}
									</p>
									<p className="text-sm text-medium-gray dark:text-light-gray">
										(
										{moment
											.duration(moment(record.end_time, "HH:mm").diff(moment(record.start_time, "HH:mm")))
											.asHours()
											.toFixed(1)}
										시간)
									</p>
									{record.meal_allowance > 0 && <p className="text-sm text-medium-gray dark:text-light-gray">식대: {record.meal_allowance.toLocaleString()}원</p>}
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

				<div className="mt-6 flex flex-col sm:flex-row justify-between items-center p-4 bg-cream-white dark:bg-charcoal-gray border-t border-gray-200 dark:border-gray-700 rounded-b-2xl -mx-6 -mb-6">
					{totalDailyWage > 0 && <p className="text-lg font-semibold text-mint-green dark:text-mint-green-light mb-4 sm:mb-0">총 일급: {totalDailyWage.toLocaleString()}원</p>}
					<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
						<button
							onClick={handleAddRecord}
							className="px-4 py-2 bg-mint-green text-white rounded-full font-medium hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2 w-full sm:w-auto">
							<PlusIcon size={20} />
							<span>근무 추가</span>
						</button>
						<button onClick={onClose} className="px-4 py-2 bg-medium-gray text-white rounded-full font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105 w-full sm:w-auto">
							닫기
						</button>
					</div>
				</div>

				<DailyRecordModal
					selectedDate={selectedDate}
					isOpen={isDailyRecordModalOpen}
					onClose={handleDailyRecordModalClose}
					session={session}
					jobs={jobs}
					recordToEdit={selectedRecordForEdit} // 편집할 기록 전달
				/>
			</div>
		</div>
	)
}

export default DailyRecordListModal
