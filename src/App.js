import React, { useState, useEffect, useCallback } from "react"
import CalendarView from "./components/CalendarView"
import HourlyRateSettingModal from "./components/HourlyRateSettingModal"
import HamburgerMenu from "./components/HamburgerMenu" // HamburgerMenu 임포트
import JobManagementModal from "./components/JobManagementModal" // JobManagementModal 임포트
import { supabase } from "./supabaseClient"
import moment from "moment"
import { ToastProvider, useToast } from "./contexts/ToastContext"
import { ConfirmProvider } from "./contexts/ConfirmContext"

// This is a dummy comment to trigger a new commit

const AppContent = () => {
	const [isHourlyRateModalOpen, setIsHourlyRateModalOpen] = useState(false)
	const [isJobManagementModalOpen, setIsJobManagementModalOpen] = useState(false) // 직업 관리 모달 상태 추가
	const [session, setSession] = useState(null)
	const [username, setUsername] = useState(null) // username 상태 추가
	const [jobs, setJobs] = useState([]) // 직업 목록 상태 추가
	const [deferredPrompt, setDeferredPrompt] = useState(null) // PWA 설치 프롬프트 상태
	const showToast = useToast()

	const fetchProfile = useCallback(async () => {
		if (!session) return

		const { user } = session
		const { data, error } = await supabase.from("profiles").select("username").eq("user_id", user.id).single()

		if (error && error.code !== "PGRST116") {
			console.error("Error fetching profile:", error)
		} else if (data) {
			setUsername(data.username)
		} else {
			// 프로필이 없으면 새로 생성
			const { error: insertError } = await supabase.from("profiles").insert([{ user_id: user.id, username: user.email.split("@")[0] }]) // 이메일 앞부분을 기본 username으로 설정
			if (insertError) {
				console.error("Error inserting new profile:", insertError)
			} else {
				setUsername(user.email.split("@")[0])
			}
		}
	}, [session])

	const fetchHourlyRate = useCallback(async () => {
		if (!session) return // 세션이 없으면 시급을 가져오지 않음

		// 이 함수는 이제 App.js에서 직접 hourlyRate 상태를 업데이트하지 않습니다.
		// 대신, HourlyRateSettingModal에서 시급을 저장한 후 fetchJobs를 호출하여
		// 최신 시급 정보가 반영된 직업 목록을 가져오도록 합니다.
		// CalendarView나 DailyRecordModal 등에서 필요한 시급은 해당 컴포넌트 내에서
		// job_id와 날짜를 기반으로 조회하게 됩니다.
	}, [session])

	const checkAndMigrateJobs = useCallback(async () => {
		if (!session) return

		const { data: jobsData, error: jobsError } = await supabase.from("jobs").select("id").eq("user_id", session.user.id)

		if (jobsError) {
			console.error("Error checking jobs:", jobsError)
			return
		}

		if (jobsData.length === 0) {
			// 직업이 하나도 없으면 기본 직업 생성
			console.log("No jobs found. Creating a default job...")
			const { data: newJob, error: insertJobError } = await supabase
				.from("jobs")
				.insert([{ user_id: session.user.id, job_name: "기본 직업" }])
				.select()
				.single()

			if (insertJobError) {
				console.error("Error creating default job:", insertJobError)
				return
			}
			const defaultJobId = newJob.id
			console.log("Default job created with ID:", defaultJobId)

			// 기존 hourly_rate_history 마이그레이션
			console.log("Migrating existing hourly_rate_history...")
			const { error: updateRateError } = await supabase.from("hourly_rate_history").update({ job_id: defaultJobId }).is("job_id", null).eq("user_id", session.user.id)
			if (updateRateError) {
				console.error("Error migrating hourly_rate_history:", updateRateError)
			} else {
				console.log("Hourly rate history migrated.")
			}

			// 기존 work_records 마이그레이션
			console.log("Migrating existing work_records...")
			const { error: updateWorkError } = await supabase.from("work_records").update({ job_id: defaultJobId }).is("job_id", null).eq("user_id", session.user.id)
			if (updateWorkError) {
				console.error("Error migrating work_records:", updateWorkError)
			} else {
				console.log("Work records migrated.")
			}
		}
	}, [session])

	const fetchJobs = useCallback(async () => {
		if (!session) return
		const { data, error } = await supabase.from("jobs").select("id, job_name, description, payday, color").eq("user_id", session.user.id).eq("is_deleted", false).order("created_at", { ascending: true })

		if (error) {
			console.error("Error fetching jobs:", error)
		} else {
			setJobs(data)
		}
	}, [session])

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session)
		})

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session)
		})

		window.addEventListener("beforeinstallprompt", (e) => {
			e.preventDefault()
			setDeferredPrompt(e)
		})

		return () => subscription.unsubscribe()
	}, [])

	useEffect(() => {
		if (session) {
			fetchHourlyRate()
			fetchProfile()
			checkAndMigrateJobs() // 로그인 시 직업 확인 및 마이그레이션
			fetchJobs() // 직업 목록 가져오기
		}
	}, [session, fetchHourlyRate, fetchProfile, checkAndMigrateJobs, fetchJobs])

	const saveHourlyRate = async (jobId, newRate, effectiveDate) => {
		if (!session) return

		// 1. 이전에 설정된, 같은 effective_date의 기록이 있는지 확인하고 삭제 (중복 방지)
		const { error: deleteError } = await supabase.from("hourly_rate_history").delete().eq("user_id", session.user.id).eq("job_id", jobId).eq("effective_date", effectiveDate)

		if (deleteError) {
			console.error("Error deleting duplicate rate record:", deleteError)
			// 오류가 발생해도 계속 진행할 수 있지만, 사용자에게 알리는 것이 좋을 수 있음
		}

		// 2. 새로운 시급의 effective_date 이전에 유효했던 마지막 시급 기록을 찾아 end_date를 업데이트
		const previousDate = moment(effectiveDate).subtract(1, "days").format("YYYY-MM-DD")

		const { data: previousRates, error: fetchError } = await supabase.from("hourly_rate_history").select("id").eq("user_id", session.user.id).eq("job_id", jobId).lte("effective_date", previousDate).is("end_date", null)

		if (fetchError) {
			console.error("Error fetching previous hourly rates:", fetchError)
		} else if (previousRates.length > 0) {
			for (const rate of previousRates) {
				const { error: updateError } = await supabase.from("hourly_rate_history").update({ end_date: previousDate }).eq("id", rate.id)
				if (updateError) {
					console.error("Error updating previous rate end_date:", updateError)
				}
			}
		}

		// 3. 새로운 시급 기록 삽입
		const { error: insertError } = await supabase.from("hourly_rate_history").insert([{ hourly_rate: newRate, user_id: session.user.id, job_id: jobId, effective_date: effectiveDate, end_date: null }])

		if (insertError) {
			console.error("Error inserting new hourly rate:", insertError)
			showToast("저장하지 못했어요", "error")
		} else {
			console.log("New hourly rate saved successfully.")
			showToast("시급을 저장했어요", "success")
			fetchJobs() // 시급 저장 후 직업 목록을 다시 가져와 최신 시급 정보 반영
		}
	}

	const handleGoogleLogin = async () => {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: "google",
		})
		if (error) console.error("Error logging in with Google:", error.message)
	}

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut()
		if (error) console.error("Error logging out:", error.message)
	}

	const handleInstallPWA = async () => {
		if (deferredPrompt) {
			deferredPrompt.prompt()
			const { outcome } = await deferredPrompt.userChoice
			console.log(`User response to the install prompt: ${outcome}`)
			setDeferredPrompt(null) // 프롬프트 사용 후 초기화
		}
	}

	const handleGoHome = () => {
		window.location.reload()
	}

	return (
		<>
			{/* 🏗️ 이토스 UX/UI: 통합 헤더 구조 */}
			{session && (
				<header className="fixed top-0 left-0 right-0 z-layer-nav bg-transparent pointer-events-none">
					<div className="flex justify-between items-center p-4 pointer-events-auto">
						{/* 로고 & 타이틀 */}
						<div className="flex items-center space-x-2 cursor-pointer hover:scale-105 transition-transform duration-200" onClick={handleGoHome}>
							<img src={process.env.PUBLIC_URL + "/logo192.png"} alt="시급이요 로고" className="w-8 h-8" />
							<h1 className="text-dark-navy dark:text-white text-xl font-bold">시급이요</h1>
						</div>
						
						{/* 햄버거 메뉴 */}
						<HamburgerMenu 
							session={session} 
							onLogout={handleLogout} 
							username={username} 
							onOpenJobManagementModal={() => setIsJobManagementModalOpen(true)} 
							deferredPrompt={deferredPrompt} 
							onInstallPWA={handleInstallPWA} 
						/>
					</div>
				</header>
			)}

			<div className="App bg-cream-white dark:bg-deep-navy min-h-screen flex flex-col items-center justify-center p-4 pt-16">
				{!session ? (
					<div className="flex flex-col items-center bg-cream-white dark:bg-charcoal-gray p-8 rounded-xl shadow-2xl max-w-md mx-auto my-8">
						<div className="flex items-center justify-center mb-6">
							<img src={process.env.PUBLIC_URL + "/logo192.png"} alt="시급이요 로고" className="w-12 h-12 mr-3" />
							<h1 className="text-dark-navy dark:text-white text-4xl font-bold">시급이요</h1>
						</div>
						<p className="bg-gray-100 dark:bg-gray-700 text-dark-navy dark:text-white p-6 rounded-xl shadow-lg text-lg font-semibold mb-8 text-center flex flex-col items-center gap-2">
							<span>내 시급</span>
							<span>내 근무 기록</span>
							<span>내 수입을 한눈에!</span>
						</p>

						<button
							onClick={handleGoogleLogin}
							className="px-6 py-3 bg-mint-green text-white rounded-full text-lg font-semibold shadow-md
										hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 mt-8 flex items-center justify-center space-x-2">
							Google 로그인
						</button>
						<p className="text-light-gray dark:text-white text-xs mt-4 text-center">로그인하여 개인화된 서비스를 이용하세요.</p>
					</div>
				) : (
					<>
						<CalendarView onOpenHourlyRateModal={() => setIsHourlyRateModalOpen(true)} session={session} jobs={jobs} />
						<HourlyRateSettingModal
							isOpen={isHourlyRateModalOpen}
							onClose={() => {
								setIsHourlyRateModalOpen(false)
								fetchHourlyRate() // 모달이 닫힐 때 시급 정보를 다시 가져옴
								fetchJobs() // 직업 정보도 다시 가져올 수 있음 (필요 시)
							}}
							onSaveHourlyRate={saveHourlyRate}
							session={session}
							jobs={jobs}
							fetchJobs={fetchJobs}
						/>
						<JobManagementModal isOpen={isJobManagementModalOpen} onClose={() => setIsJobManagementModalOpen(false)} session={session} jobs={jobs} fetchJobs={fetchJobs} />
					</>
				)}
			</div>

		</>
	)
}

function App() {
	return (
		<ToastProvider>
			<ConfirmProvider>
				<AppContent />
			</ConfirmProvider>
		</ToastProvider>
	)
}

export default App
