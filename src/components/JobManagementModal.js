import React, { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import { useModalManager } from "../utils/modalManager"
import { useToast } from "../contexts/ToastContext"
import { useConfirm } from "../contexts/ConfirmContext"
import { useReportCache } from "../contexts/ReportCacheContext";
// 🚀 트리셰이킹 최적화: 개별 import
// 🚀 트리셰이킹 최적화: 필요한 아이콘만 import
import { PencilIcon, Trash2Icon, PlusIcon, Target, Calendar, CheckCircle, XCircle } from "lucide-react"
import { JOB_COLORS } from "../constants/JobColors"
import BreakTimePolicyManager from "./BreakTimePolicyManager"
import { DEFAULT_BREAK_POLICIES, clearBreakTimeCache } from "../utils/breakTime"
import { clearWeeklyAllowanceCache } from "../utils/weeklyAllowance"

// 🎨 이토스 UX/UI: 변별력 높은 토스 브랜드 색상 시스템
const colorPresets = JOB_COLORS.map(color => ({
	name: color.name,
	value: color.value
}))

const JobManagementModal = ({ isOpen, onClose, session, jobs, fetchJobs }) => {
	const { openModal, closeModal } = useModalManager()
	const showToast = useToast()
	const showConfirm = useConfirm()
  const { clearCache: clearReportCache } = useReportCache();
	const [newJobName, setNewJobName] = useState("")
	const [newJobDescription, setNewJobDescription] = useState("")
	const [newPayday, setNewPayday] = useState("")
	const [newColor, setNewColor] = useState(colorPresets[0].value)
	const [paydayError, setPaydayError] = useState("")
	const [editingJob, setEditingJob] = useState(null)
	const [viewMode, setViewMode] = useState("list") // 'list', 'add', 'edit'
	
	// 휴게시간 정책 상태
	const [breakTimeEnabled, setBreakTimeEnabled] = useState(true)
	const [breakTimePaid, setBreakTimePaid] = useState(false)
	const [breakTimePolicies, setBreakTimePolicies] = useState(DEFAULT_BREAK_POLICIES)
	
	// 주휴수당 정책 상태
	const [weeklyAllowanceEnabled, setWeeklyAllowanceEnabled] = useState(true)
	const [weeklyAllowanceMinHours, setWeeklyAllowanceMinHours] = useState(15)

	const [showModal, setShowModal] = useState(false)
	const [animateModal, setAnimateModal] = useState(false)

	useEffect(() => {
		if (isOpen) {
			setShowModal(true)
			setTimeout(() => setAnimateModal(true), 10)
			openModal() // 🎯 모달 매니저로 헤더 숨김 관리
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
				setBreakTimeEnabled(true)
				setBreakTimePaid(false)
				setBreakTimePolicies(DEFAULT_BREAK_POLICIES)
				setPaydayError("")
				setViewMode("list") // Reset view mode on close
			}, 300)
			closeModal() // 🎯 모달 매니저로 헤더 복원 관리
		}
	}, [isOpen, openModal, closeModal])

	useEffect(() => {
		return () => {
			closeModal() // 🎯 모달 매니저로 정리
		}
	}, [closeModal])

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
			break_time_enabled: breakTimeEnabled,
			break_time_paid: breakTimePaid,
			break_time_policies: breakTimePolicies,
			weekly_allowance_enabled: weeklyAllowanceEnabled,
			weekly_allowance_min_hours: weeklyAllowanceMinHours,
		}

		if (editingJob) {
			const { error } = await supabase.from("jobs").update(jobData).eq("id", editingJob.id).eq("user_id", session.user.id)
			if (error) {
				console.error("Error updating job:", error)
				showToast("수정하지 못했어요", "error")
			} else {
				showToast("직업 정보를 바꿨어요", "success")
				clearBreakTimeCache() // 휴게시간 캐시 무효화
				clearWeeklyAllowanceCache() // 주휴수당 캐시 무효화
        clearReportCache(); // 월별 보고서 캐시 무효화
				fetchJobs()
				
				// 🎯 캐시 무효화: 직업 수정으로 인한 급여 재계산 필요
				try { 
					window.dispatchEvent(new Event('work-records-changed'))
					console.log('💾 직업 수정으로 인한 급여 캐시 무효화 완료')
				} catch (_) {}
				
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
				clearBreakTimeCache() // 휴게시간 캐시 무효화
				clearWeeklyAllowanceCache() // 주휴수당 캐시 무효화
        clearReportCache(); // 월별 보고서 캐시 무효화
				fetchJobs()
				
				// 🎯 캐시 무효화: 직업 변경으로 인한 급여 재계산 필요
				try { 
					window.dispatchEvent(new Event('work-records-changed'))
					console.log('💾 직업 추가로 인한 급여 캐시 무효화 완료')
				} catch (_) {}
				
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
				clearBreakTimeCache() // 휴게시간 캐시 무효화
				clearWeeklyAllowanceCache() // 주휴수당 캐시 무효화
        clearReportCache(); // 월별 보고서 캐시 무효화
				fetchJobs()
				
				// 🎯 캐시 무효화: 직업 삭제로 인한 급여 재계산 필요
				try { 
					window.dispatchEvent(new Event('work-records-changed'))
					console.log('💾 직업 삭제로 인한 급여 캐시 무효화 완료')
				} catch (_) {}
				
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
		setBreakTimeEnabled(job.break_time_enabled !== false) // 기본값 true
		setBreakTimePaid(job.break_time_paid || false)
		setBreakTimePolicies(job.break_time_policies || DEFAULT_BREAK_POLICIES)
		setWeeklyAllowanceEnabled(job.weekly_allowance_enabled !== false) // 기본값 true
		setWeeklyAllowanceMinHours(job.weekly_allowance_min_hours || 15)
		setPaydayError("")
		setViewMode("edit") // Switch to edit view
	}

	const handleCancelEdit = () => {
		setEditingJob(null)
		setNewJobName("")
		setNewJobDescription("")
		setNewPayday("")
		setNewColor(colorPresets[0].value)
		setBreakTimeEnabled(true)
		setBreakTimePaid(false)
		setBreakTimePolicies(DEFAULT_BREAK_POLICIES)
		setWeeklyAllowanceEnabled(true)
		setWeeklyAllowanceMinHours(15)
		setPaydayError("")
		setViewMode("list") // Switch back to list view
	}

	const handleAddJobClick = () => {
		setEditingJob(null) // Ensure no job is being edited
		setNewJobName("")
		setNewJobDescription("")
		setNewPayday("")
		setNewColor(colorPresets[0].value)
		setBreakTimeEnabled(true)
		setBreakTimePaid(false)
		setBreakTimePolicies(DEFAULT_BREAK_POLICIES)
		setWeeklyAllowanceEnabled(true)
		setWeeklyAllowanceMinHours(15)
		setPaydayError("")
		setViewMode("add") // Switch to add view
	}

	if (!showModal) return null

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} z-layer-modal p-4`}>
			<div className={`bg-cream-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/50 w-full max-w-md transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0" : "translate-y-10"} flex flex-col max-h-[90vh]`}>
				{/* 🎯 이토스 디자인: 고정 헤더 영역 */}
				<div className="flex justify-between items-center p-6 pb-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">
						{viewMode === "list" && "직업 관리"}
						{viewMode === "add" && "새 직업 추가"}
						{viewMode === "edit" && "직업 편집"}
					</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>
				
				{/* 🎯 이토스 디자인: 스크롤 가능한 내용 영역 */}
				<div className="flex-1 overflow-y-auto px-6 py-4">

				{viewMode === "list" && (
					<div className="space-y-4 mb-6">
						{jobs.length === 0 ? (
							<p className="text-medium-gray dark:text-light-gray text-center py-4">등록된 직업이 없습니다. 새 직업을 추가해보세요!</p>
						) : (
							<div className="max-h-72 overflow-y-auto space-y-3 pr-1">
								{jobs.map((job, index) => (
									<div key={job.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md dark:hover:shadow-lg transition-all duration-200 overflow-hidden">
										{/* 🎨 이토스 디자인: 카드 헤더 */}
										<div className="p-4 border-b border-gray-100 dark:border-gray-700">
											<div className="flex items-center justify-between">
												<div className="flex items-center space-x-3 flex-1 min-w-0">
													{/* 컬러 인디케이터 */}
													<div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: job.color || "#6B7280" }}></div>
													
													{/* 직업 정보 */}
													<div className="flex-1 min-w-0">
														<h3 className="font-bold text-base text-dark-navy dark:text-white truncate break-keep">
															{job.job_name}
														</h3>
														{job.description && (
															<p className="text-sm text-gray-600 dark:text-gray-400 truncate break-keep mt-0.5">
																{job.description}
															</p>
														)}
													</div>
												</div>
												
												{/* 액션 버튼 */}
												<div className="flex items-center space-x-1 flex-shrink-0">
													<button 
														onClick={() => handleEditClick(job)} 
														className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200" 
														aria-label="수정"
													>
														<PencilIcon size={16} />
													</button>
													<button 
														onClick={() => handleDeleteJob(job.id)} 
														className={`p-2 rounded-lg transition-all duration-200 ${
															index === 0 
																? "opacity-50 cursor-not-allowed text-gray-300 dark:text-gray-600" 
																: "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
														}`} 
														disabled={index === 0} 
														aria-label="삭제"
													>
														<Trash2Icon size={16} />
													</button>
												</div>
											</div>
										</div>
										
										{/* 🎨 이토스 디자인: 카드 본문 - 세부 정보 */}
										<div className="p-4 space-y-3">
											{/* 월급일 정보 */}
											{job.payday && (
												<div className="flex items-center space-x-2">
													<Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
													<span className="text-sm text-gray-700 dark:text-gray-300 break-keep">
														매월 {job.payday}일 급여
													</span>
												</div>
											)}
											
											{/* 정책 상태 뱃지들 */}
											<div className="flex flex-wrap gap-2">
												{/* 휴게시간 정책 */}
												<div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
													job.break_time_enabled 
														? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
														: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
												}`}>
													{job.break_time_enabled ? (
														<CheckCircle className="w-3 h-3" />
													) : (
														<XCircle className="w-3 h-3" />
													)}
													<span className="break-keep">휴게시간</span>
													{job.break_time_enabled && (
														<span className="break-keep">
															({job.break_time_paid ? '유급' : '무급'})
														</span>
													)}
												</div>
												
												{/* 주휴수당 정책 */}
												<div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
													job.weekly_allowance_enabled 
														? 'bg-mint-green/10 dark:bg-mint-green/20 text-mint-green-dark dark:text-mint-green border border-mint-green/30'
														: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
												}`}>
													{job.weekly_allowance_enabled ? (
														<Target className="w-3 h-3" />
													) : (
														<XCircle className="w-3 h-3" />
													)}
													<span className="break-keep">주휴수당</span>
													{job.weekly_allowance_enabled && (
														<span className="break-keep">
															({job.weekly_allowance_min_hours || 15}h+)
														</span>
													)}
												</div>
											</div>
											

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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
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
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
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
                                className={`mt-1 block w-full px-3 py-2 border ${paydayError ? "border-red-500" : "border-gray-300"} rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white`}
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
						
						{/* 🎯 이토스 디자인: 휴게시간 정책 설정 */}
						<div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
							<BreakTimePolicyManager
								policies={breakTimePolicies}
								onPoliciesChange={setBreakTimePolicies}
								enabled={breakTimeEnabled}
								onEnabledChange={setBreakTimeEnabled}
								paid={breakTimePaid}
								onPaidChange={setBreakTimePaid}
							/>
						</div>
						
						{/* 🎯 이토스 디자인: 주휴수당 정책 설정 */}
						<div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<h4 className="text-base font-semibold text-dark-navy dark:text-white">주휴수당</h4>
										<p className="text-sm text-medium-gray dark:text-light-gray">주간 근무시간이 기준 이상일 때 평균 일급을 지급</p>
									</div>
									<button
										onClick={() => setWeeklyAllowanceEnabled(!weeklyAllowanceEnabled)}
										className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
											weeklyAllowanceEnabled ? 'bg-mint-green' : 'bg-gray-300 dark:bg-gray-600'
										}`}
									>
										<span
											className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
												weeklyAllowanceEnabled ? 'translate-x-6' : 'translate-x-1'
											}`}
										/>
									</button>
								</div>
								
								{weeklyAllowanceEnabled && (
									<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
										<div>
											<label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
												주간 최소 근무시간 (시간)
											</label>
											<input
												type="number"
												value={weeklyAllowanceMinHours}
												onChange={(e) => setWeeklyAllowanceMinHours(Math.max(0, parseFloat(e.target.value) || 0))}
												className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
												placeholder="15"
												min="0"
												step="0.5"
											/>
											<p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
												이 시간 이상 근무 시 주휴수당 지급 (일반적으로 15시간)
											</p>
										</div>
										
										<div className="bg-blue-100 dark:bg-blue-800/30 rounded-lg p-3">
											<h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">💡 주휴수당 계산 방식</h5>
											<ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
												<li>• 주간 총 근무시간 ÷ 근무일수 = 평균 일 근무시간</li>
												<li>• 평균 일 근무시간 × 평균 시급 = 주휴수당</li>
												<li>• 휴게시간은 제외하고 계산됩니다</li>
											</ul>
										</div>
									</div>
								)}
							</div>
						</div>
						
					</div>
				)}
				
				</div>
				
				{/* 🎯 이토스 디자인: 고정 버튼 영역 */}
				{(viewMode === "add" || viewMode === "edit") && (
					<div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
						<div className="flex justify-end space-x-3">
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
