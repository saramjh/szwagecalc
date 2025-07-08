import React, { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

import { useToast } from "../contexts/ToastContext"
import { useConfirm } from "../contexts/ConfirmContext"
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react"

const colorPresets = [
	{ name: "Red", value: "#ffadad" },
	{ name: "Orange", value: "#ffd6a5" },
	{ name: "Yellow", value: "#fdffb6" },
	{ name: "Green", value: "#caffbf" },
	{ name: "Blue", value: "#9bf6ff" },
	{ name: "Purple", value: "#bdb2ff" },
	{ name: "Gray", value: "#eaeaea" },
]

const JobManagementModal = ({ isOpen, onClose, session, jobs, fetchJobs }) => {
	const showToast = useToast()
	const showConfirm = useConfirm()
	const [newJobName, setNewJobName] = useState("")
	const [newJobDescription, setNewJobDescription] = useState("")
	const [newPayday, setNewPayday] = useState("")
	const [newColor, setNewColor] = useState(colorPresets[0].value)
	const [paydayError, setPaydayError] = useState("")
	const [editingJob, setEditingJob] = useState(null)
	const [viewMode, setViewMode] = useState("list") // 'list', 'add', 'edit'

	const [showModal, setShowModal] = useState(false)
	const [animateModal, setAnimateModal] = useState(false)

	useEffect(() => {
		if (isOpen) {
			setShowModal(true)
			setTimeout(() => setAnimateModal(true), 10)
			document.body.classList.add("modal-open")
			setViewMode("list") // Always start with the list view when opening
		} else {
			setAnimateModal(false)
			setTimeout(() => {
				setShowModal(false)
				// Reset fields when modal is fully closed
				setEditingJob(null)
				setNewJobName("")
				setNewJobDescription("")
				setNewPayday("")
				setNewColor(colorPresets[0].value)
				setPaydayError("")
				setViewMode("list") // Reset view mode on close
			}, 300)
			document.body.classList.remove("modal-open")
		}
	}, [isOpen])

	useEffect(() => {
		return () => {
			document.body.classList.remove("modal-open")
		}
	}, [])

	const handlePaydayChange = (e) => {
		const value = e.target.value
		// Allow empty string to clear the input, but validate numbers
		if (value === "" || (Number(value) >= 1 && Number(value) <= 31)) {
			setNewPayday(value)
			setPaydayError("")
		} else {
			setPaydayError("월급일은 1에서 31 사이의 숫자여야 합니다.")
		}
	}

	const handleSaveJob = async () => {
		if (!session || !newJobName.trim()) {
			showToast("직업 이름은 필수입니다.", "error")
			return
		}
		if (paydayError) {
			showToast(paydayError, "error")
			return
		}

		const jobData = {
			job_name: newJobName,
			description: newJobDescription,
			payday: newPayday ? parseInt(newPayday, 10) : null,
			color: newColor,
		}

		if (editingJob) {
			const { error } = await supabase.from("jobs").update(jobData).eq("id", editingJob.id).eq("user_id", session.user.id)
			if (error) {
				console.error("Error updating job:", error)
				showToast("수정하지 못했어요", "error")
			} else {
				showToast("직업 정보를 바꿨어요", "success")
				fetchJobs()
				setViewMode("list") // Go back to list view
			}
		} else {
			const { error } = await supabase
				.from("jobs")
				.insert([{ ...jobData, user_id: session.user.id }])
				.select()
			if (error) {
				console.error("Error adding job:", error)
				showToast("추가하지 못했어요", "error")
			} else {
				showToast("새로운 직업을 추가했어요", "success")
				fetchJobs()
				setViewMode("list") // Go back to list view
			}
		}
	}

	const handleDeleteJob = async (jobId) => {
		if (!session) return

		showConfirm("정말 삭제하시겠어요? 관련 기록이 모두 사라져요.", async () => {
			const { error } = await supabase.from("jobs").update({ is_deleted: true }).eq("id", jobId).eq("user_id", session.user.id)
			if (error) {
				console.error("Error deleting job and related records:", error)
				showToast(`삭제하지 못했어요`, "error")
			} else {
				showToast("삭제했어요", "success")
				fetchJobs()
				handleCancelEdit() // Reset form if the deleted job was being edited
			}
		})
	}

	const handleEditClick = (job) => {
		setEditingJob(job)
		setNewJobName(job.job_name)
		setNewJobDescription(job.description || "")
		setNewPayday(job.payday || "")
		setNewColor(job.color || colorPresets[0].value)
		setPaydayError("")
		setViewMode("edit") // Switch to edit view
	}

	const handleCancelEdit = () => {
		setEditingJob(null)
		setNewJobName("")
		setNewJobDescription("")
		setNewPayday("")
		setNewColor(colorPresets[0].value)
		setPaydayError("")
		setViewMode("list") // Switch back to list view
	}

	const handleAddJobClick = () => {
		setEditingJob(null) // Ensure no job is being edited
		setNewJobName("")
		setNewJobDescription("")
		setNewPayday("")
		setNewColor(colorPresets[0].value)
		setPaydayError("")
		setViewMode("add") // Switch to add view
	}

	if (!showModal) return null

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
			<div className={`bg-cream-white dark:bg-charcoal-gray rounded-lg shadow-lg p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0" : "translate-y-10"}`}>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">
						{viewMode === "list" && "직업 관리"}
						{viewMode === "add" && "새 직업 추가"}
						{viewMode === "edit" && "직업 편집"}
					</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>

				{viewMode === "list" && (
					<div className="space-y-4 mb-6">
						{jobs.length === 0 ? (
							<p className="text-medium-gray dark:text-light-gray text-center py-4">등록된 직업이 없습니다. 새 직업을 추가해보세요!</p>
						) : (
							<div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
								{jobs.map((job, index) => (
									<div key={job.id} className="flex items-center py-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0 rounded-md">
										<div className="w-1.5 h-12 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: job.color || "transparent" }}></div>
										<div onClick={() => handleEditClick(job)} className="flex-grow cursor-pointer">
											<div className="font-bold text-lg text-dark-navy dark:text-white">{job.job_name}</div>
											{job.payday && <p className="text-sm text-medium-gray dark:text-light-gray mt-0.5">월급일: 매월 {job.payday}일</p>}
										</div>
										<div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
											<button onClick={() => handleEditClick(job)} className="p-2 rounded-full text-medium-gray dark:text-light-gray hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200" aria-label="수정">
												<PencilIcon size={20} />
											</button>
											<button onClick={() => handleDeleteJob(job.id)} className={`p-2 rounded-full text-coral-pink hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200 ${index === 0 ? "opacity-50 cursor-not-allowed" : ""}`} disabled={index === 0} aria-label="삭제">
												<Trash2Icon size={20} />
											</button>
										</div>
									</div>
								))}
							</div>
						)}
						<button
							onClick={handleAddJobClick}
							className="w-full px-4 py-2 bg-mint-green text-white rounded-full font-medium hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center space-x-2">
							<PlusIcon size={20} />
							<span>새 직업 추가</span>
						</button>
					</div>
				)}

				{(viewMode === "add" || viewMode === "edit") && (
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
						<div>
							<label htmlFor="payday" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
								월급일 (1-31일, 선택 사항)
							</label>
							<input
								type="number"
								id="payday"
								value={newPayday}
								onChange={handlePaydayChange}
								className={`mt-1 block w-full px-3 py-2 border ${paydayError ? "border-red-500" : "border-gray-300"} rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white`}
								placeholder="예: 25"
								min="1"
								max="31"
							/>
							{paydayError && <p className="text-red-500 text-xs mt-1">{paydayError}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium text-medium-gray dark:text-light-gray">직업 색상</label>
							<div className="mt-2 flex flex-wrap gap-2">
								{colorPresets.map((color) => (
									<button
										key={color.value}
										type="button"
										onClick={() => setNewColor(color.value)}
										className={`w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 ${newColor === color.value ? "ring-2 ring-offset-2 ring-mint-green dark:ring-offset-charcoal-gray" : "border-transparent"}`}
										style={{ backgroundColor: color.value }}
										aria-label={color.name}
									/>
								))}
							</div>
						</div>
						<div className="mt-6 flex justify-end space-x-3">
							<button onClick={handleCancelEdit} className="px-4 py-2 bg-medium-gray text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
								취소
							</button>
							<button onClick={handleSaveJob} className="px-4 py-2 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105">
								{editingJob ? "변경 사항 저장" : "직업 추가"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default JobManagementModal
