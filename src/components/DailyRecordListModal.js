import React, { useState, useEffect, useCallback } from "react"
import moment from "moment"
import { supabase } from "../supabaseClient"
import DailyRecordModal from "./DailyRecordModal"
import { useConfirm } from "../contexts/ConfirmContext"
import { useToast } from "../contexts/ToastContext"

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
			.select("*, jobs(job_name)") // job_name도 함께 가져오도록 수정
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
			<div className={`bg-cream-white dark:bg-charcoal-gray rounded-2xl shadow-lg p-6 w-full max-w-md transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0" : "translate-y-10"}`}>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">{moment(selectedDate).format("YYYY년 M월 D일 (ddd)")}</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>

				<div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
					{dailyRecords.length === 0 ? (
						<p className="text-medium-gray dark:text-light-gray text-center py-4">기록된 근무가 없습니다.</p>
					) : (
						dailyRecords.map((record) => (
							<div key={record.id} className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0">
								{/* 정보 섹션 */}
								<div className="flex-grow">
									{record.jobs?.job_name && <span className="inline-block bg-gray-100 dark:bg-gray-700 text-dark-navy dark:text-white px-2 py-1 rounded-full text-xs font-medium self-start mb-1">{record.jobs.job_name}</span>}
									<p className="text-lg font-bold text-dark-navy dark:text-white">일급: {record.daily_wage.toLocaleString()}원</p>
									<p className="text-sm text-medium-gray dark:text-light-gray">
										근무: {record.start_time} ~ {record.end_time} (
										{moment
											.duration(moment(record.end_time, "HH:mm").diff(moment(record.start_time, "HH:mm")))
											.asHours()
											.toFixed(1)}
										시간)
									</p>
									<p className="text-sm text-medium-gray dark:text-light-gray">식대: {record.meal_allowance.toLocaleString()}원</p>
									{record.notes && <p className="text-sm text-medium-gray dark:text-light-gray">비고: {record.notes}</p>}
								</div>
								{/* 버튼 섹션 */}
								<div className="flex flex-col space-y-2 ml-4">
									<button onClick={() => handleEditRecord(record)} className="px-3 py-1 rounded-lg text-sm font-medium text-white bg-medium-gray hover:bg-gray-600 transition-colors duration-200 w-16">
										편집
									</button>
									<button onClick={() => handleDeleteRecord(record.id)} className="px-3 py-1 rounded-lg text-sm font-medium text-white bg-coral-pink hover:bg-coral-pink-dark transition-colors duration-200 w-16">
										삭제
									</button>
								</div>
							</div>
						))
					)}
				</div>

				<div className="mt-6 flex justify-between items-center">
					<button onClick={handleAddRecord} className="px-4 py-2 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
						근무 추가
					</button>
					<button onClick={onClose} className="px-4 py-2 bg-medium-gray text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
						닫기
					</button>
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
