import React, { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'

const JobManagementModal = ({ isOpen, onClose, session, jobs, fetchJobs }) => {
	const showToast = useToast()
	const showConfirm = useConfirm()
	const [newJobName, setNewJobName] = useState("")
	const [newJobDescription, setNewJobDescription] = useState("")
	const [editingJob, setEditingJob] = useState(null) // null: 추가 모드, object: 편집 모드

	const [showModal, setShowModal] = useState(false) // 모달의 실제 렌더링 여부
	const [animateModal, setAnimateModal] = useState(false) // 애니메이션 클래스 적용 여부

	useEffect(() => {
		if (isOpen) {
			setShowModal(true) // 모달을 DOM에 렌더링 시작
			setTimeout(() => setAnimateModal(true), 10) // 약간의 지연 후 애니메이션 시작
			document.body.classList.add('modal-open'); // 모달이 열릴 때 body 스크롤 잠금
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => setShowModal(false), 300) // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
			document.body.classList.remove('modal-open'); // 모달이 닫힐 때 body 스크롤 잠금 해제
		}
	}, [isOpen])

	// 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
	useEffect(() => {
		return () => {
			document.body.classList.remove('modal-open');
		};
	}, []);

	useEffect(() => {
		// 모달이 열릴 때마다 직업 목록을 다시 가져올 필요 없음 (App.js에서 관리)
		// 편집 모드 진입 시 입력 필드 초기화
		if (!isOpen) {
			setEditingJob(null)
			setNewJobName("")
			setNewJobDescription("")
		}
	}, [isOpen])

	const handleSaveJob = async () => {
		if (!session || !newJobName.trim()) return

		if (editingJob) {
			// 편집 모드
			const { error } = await supabase.from("jobs").update({ job_name: newJobName, description: newJobDescription }).eq("id", editingJob.id).eq("user_id", session.user.id)

			if (error) {
				console.error("Error updating job:", error)
				showToast("수정하지 못했어요", "error")
			} else {
				console.log("Job updated successfully:", newJobName)
				showToast("직업 정보를 바꿨어요", "success")
				setEditingJob(null) // 편집 모드 해제
				setNewJobName("") // 입력 필드 초기화
				setNewJobDescription("") // 입력 필드 초기화
				fetchJobs() // App.js의 직업 목록 새로고침
			}
		} else {
			// 추가 모드
			console.log("Attempting to add new job:", { job_name: newJobName, description: newJobDescription })
			const { error } = await supabase.from("jobs").insert([{ user_id: session.user.id, job_name: newJobName, description: newJobDescription }])

			if (error) {
				console.error("Error adding job:", error)
				showToast("추가하지 못했어요", "error")
			} else {
				console.log("Job added successfully:", newJobName)
				showToast("새로운 직업을 추가했어요", "success")
				setNewJobName("") // 입력 필드 초기화
				setNewJobDescription("") // 입력 필드 초기화
				fetchJobs() // App.js의 직업 목록 새로고침
			}
		}
	}

	const handleDeleteJob = async (jobId) => {
		if (!session) return

		showConfirm(
			"정말 삭제하시겠어요? 관련 기록이 모두 사라져요.",
			async () => {
				const { error } = await supabase.rpc("delete_job_and_related_records", { job_id_to_delete: jobId })

				if (error) {
					console.error("Error deleting job and related records:", error)
					showToast(`삭제하지 못했어요`, "error")
				} else {
					console.log("Job and all related records deleted successfully:", jobId)
					showToast("삭제했어요", "success")
					fetchJobs() // 목록 새로고침
					// 모달 닫기 호출 제거
				}
			}
		)
	}

	const handleEditClick = (job) => {
		setEditingJob(job)
		setNewJobName(job.job_name)
		setNewJobDescription(job.description || "")
	}

	const handleCancelEdit = () => {
		setEditingJob(null)
		setNewJobName("")
		setNewJobDescription("")
	}

	if (!showModal) return null

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${animateModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
			<div className={`bg-cream-white dark:bg-charcoal-gray rounded-lg shadow-lg p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-out ${animateModal ? 'translate-y-0' : 'translate-y-10'}`}>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">직업 관리</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>

				<div className="space-y-4 mb-6">
					{jobs.length === 0 ? (
						<p className="text-medium-gray dark:text-light-gray text-center py-4">등록된 직업이 없습니다.</p>
					) : (
						<div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
							{jobs.map((job, index) => (
								<div key={job.id} className={`flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-600 last:border-b-0 ${index === 0 ? "bg-gray-50 dark:bg-gray-800 rounded-md px-2" : ""}`}>
									<div onClick={() => handleEditClick(job)} className="cursor-pointer">
										<p className={`text-dark-navy dark:text-white font-medium ${index === 0 ? "font-bold" : ""}`}>{job.job_name}</p>
										{job.description && <p className="text-sm text-medium-gray dark:text-light-gray">{job.description}</p>}
									</div>
									<div className="flex space-x-2">
										<button onClick={() => handleEditClick(job)} className={`text-mint-green hover:text-mint-green-dark transition-colors duration-200 ${index === 0 ? "" : ""}`} disabled={false}>
											편집
										</button>
										<button onClick={() => handleDeleteJob(job.id)} className={`text-coral-pink hover:text-coral-pink-dark transition-colors duration-200 ${index === 0 ? "opacity-50 cursor-not-allowed" : ""}`} disabled={index === 0}>
											삭제
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<h3 className="text-lg font-semibold text-dark-navy dark:text-white mb-3">{editingJob ? "직업 편집" : "새 직업 추가"}</h3>
				<div className="space-y-4">
					<div>
						<label htmlFor="jobName" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							직업 이름
						</label>
						<input
							type="text"
							id="jobName"
							value={newJobName}
							onChange={(e) => setNewJobName(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
							placeholder="예: 카페 알바"
						/>
					</div>
					<div>
						<label htmlFor="jobDescription" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
							설명 (선택 사항)
						</label>
						<textarea
							id="jobDescription"
							rows="2"
							value={newJobDescription}
							onChange={(e) => setNewJobDescription(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
							placeholder="예: 주말 근무, 시급 12000원"></textarea>
					</div>
				</div>

				<div className="mt-6 flex justify-end space-x-3">
					{editingJob && (
						<button onClick={handleCancelEdit} className="px-4 py-2 bg-medium-gray text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
							취소
						</button>
					)}
					<button onClick={handleSaveJob} className="px-4 py-2 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
						{editingJob ? "변경 사항 저장" : "직업 추가"}
					</button>
				</div>
			</div>
		</div>
	)
}

export default JobManagementModal
