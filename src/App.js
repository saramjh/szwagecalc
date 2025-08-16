import React, { useState, useEffect, useCallback, Suspense, lazy } from "react"
import CalendarView from "./components/CalendarView"
import HamburgerMenu from "./components/HamburgerMenu"
import { supabase } from "./supabaseClient"
import dayjs from "dayjs"
import { ToastProvider, useToast } from "./contexts/ToastContext"
import { ConfirmProvider } from "./contexts/ConfirmContext"

const HourlyRateSettingModal = lazy(() => import("./components/HourlyRateSettingModal"))
const JobManagementModal = lazy(() => import("./components/JobManagementModal"))

 

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

    // fetchHourlyRate는 더 이상 사용되지 않습니다.

	const checkAndMigrateJobs = useCallback(async () => {
		if (!session) return

		const { data: jobsData, error: jobsError } = await supabase.from("jobs").select("id").eq("user_id", session.user.id)

		if (jobsError) {
			console.error("Error checking jobs:", jobsError)
			return
		}

		if (jobsData.length === 0) {
			// 직업이 하나도 없으면 기본 직업 생성
            
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
            

			// 기존 hourly_rate_history 마이그레이션
            
			const { error: updateRateError } = await supabase.from("hourly_rate_history").update({ job_id: defaultJobId }).is("job_id", null).eq("user_id", session.user.id)
			if (updateRateError) {
				console.error("Error migrating hourly_rate_history:", updateRateError)
			} else {
                
			}

			// 기존 work_records 마이그레이션
            
			const { error: updateWorkError } = await supabase.from("work_records").update({ job_id: defaultJobId }).is("job_id", null).eq("user_id", session.user.id)
			if (updateWorkError) {
				console.error("Error migrating work_records:", updateWorkError)
			} else {
                
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

  // CSV export listener: 현재 월 work_records를 조회해 CSV 생성
  useEffect(() => {
    const handler = async () => {
      if (!session) return
      const startOfMonth = dayjs().startOf("month").format("YYYY-MM-DD")
      const endOfMonth = dayjs().endOf("month").format("YYYY-MM-DD")
      const { data, error } = await supabase
        .from("work_records")
        .select("id,date,start_time,end_time,daily_wage,meal_allowance,notes,jobs(job_name)")
        .eq("user_id", session.user.id)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .order("date", { ascending: true })
      if (error) return
      const rows = [
        ["date","job_name","start_time","end_time","daily_wage","meal_allowance","notes"],
        ...(data || []).map(r => [
          r.date,
          r.jobs?.job_name || "",
          r.start_time || "",
          r.end_time || "",
          (r.daily_wage || 0).toString(),
          (r.meal_allowance || 0).toString(),
          (r.notes || "").replaceAll("\n"," ")
        ])
      ]
      const csv = rows.map(cols => cols.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n")
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `work_records_${dayjs().format("YYYYMM")}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
    window.addEventListener("export-csv", handler)
    return () => window.removeEventListener("export-csv", handler)
  }, [session])

	useEffect(() => {
        if (session) {
            fetchProfile()
            checkAndMigrateJobs() // 로그인 시 직업 확인 및 마이그레이션
            fetchJobs() // 직업 목록 가져오기
        }
    }, [session, fetchProfile, checkAndMigrateJobs, fetchJobs])

	const saveHourlyRate = async (jobId, newRate, effectiveDate) => {
		if (!session) return

		// 1. 이전에 설정된, 같은 effective_date의 기록이 있는지 확인하고 삭제 (중복 방지)
		const { error: deleteError } = await supabase.from("hourly_rate_history").delete().eq("user_id", session.user.id).eq("job_id", jobId).eq("effective_date", effectiveDate)

		if (deleteError) {
			console.error("Error deleting duplicate rate record:", deleteError)
			// 오류가 발생해도 계속 진행할 수 있지만, 사용자에게 알리는 것이 좋을 수 있음
		}

		// 2. 새로운 시급의 effective_date 이전에 유효했던 마지막 시급 기록을 찾아 end_date를 업데이트
        const previousDate = dayjs(effectiveDate).subtract(1, "day").format("YYYY-MM-DD")

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
		try {
			// 로그아웃 진행 표시
			showToast("로그아웃 중...", "info")
			
			// 로컬 상태 먼저 정리
			setSession(null)
			setUsername(null)
			setJobs([])
			
			// Supabase 로그아웃 시도
			const { error } = await supabase.auth.signOut()
			
			if (error) {
				console.warn("Supabase logout warning:", error.message)
				// 에러가 있어도 로컬 정리는 완료되었으므로 계속 진행
			}
			
			// 로컬 스토리지 정리
			localStorage.removeItem('supabase.auth.token')
			localStorage.removeItem('sb-llvtylnqjemgsnvbfxch-auth-token')
			
			// 성공 알림 후 새로고침
			showToast("안전하게 로그아웃되었습니다", "success")
			
			setTimeout(() => {
				window.location.reload()
			}, 1000)
			
		} catch (err) {
			console.warn("Logout process error:", err.message)
			// 에러가 발생해도 강제 로그아웃 진행
			showToast("로그아웃 완료", "success")
			setSession(null)
			setUsername(null)
			setJobs([])
			setTimeout(() => {
				window.location.reload()
			}, 1000)
		}
	}

	const handleInstallPWA = async () => {
		if (deferredPrompt) {
			deferredPrompt.prompt()
            await deferredPrompt.userChoice
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
                    <div className="flex justify-between items-center px-3 py-4 pointer-events-auto max-w-[390px] w-full mx-auto">
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

            <div className="App bg-gradient-to-b from-cream-white to-gray-50 dark:from-deep-navy dark:to-charcoal-gray min-h-screen flex flex-col items-center justify-center px-4 py-6 pt-16 max-w-[390px] w-full mx-auto overflow-hidden">
				{!session ? (
					<div className="w-full max-w-sm mx-auto">
						{/* 🌟 Hero Section with Animation */}
						<div className="text-center mb-12 animate-fade-in-up">
							<div className="relative mb-8">
								<div className="absolute inset-0 bg-gradient-to-r from-mint-green/20 to-brand-purple/20 rounded-full blur-xl animate-pulse-slow"></div>
								<img 
									src={process.env.PUBLIC_URL + "/logo192.png"} 
									alt="시급이요 로고" 
									className="w-20 h-20 mx-auto relative animate-bounce-gentle drop-shadow-lg" 
								/>
							</div>
							<h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-mint-green to-brand-purple mb-4 animate-shimmer">
								시급이요
							</h1>
							<p className="text-gray-600 dark:text-gray-300 text-lg font-medium leading-relaxed">
								내 시급, 근무기록, 수입을<br />
								<span className="text-mint-green font-bold">한눈에 관리하세요</span>
							</p>
						</div>

						{/* 🎯 Feature Cards */}
						<div className="space-y-4 mb-12">
							<div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transform hover:scale-[1.02] transition-all duration-300 animate-slide-in-left">
								<div className="flex items-center space-x-4">
									<div className="w-12 h-12 bg-gradient-to-br from-mint-green to-green-400 rounded-xl flex items-center justify-center">
										<span className="text-white text-xl">💰</span>
									</div>
									<div>
										<h3 className="font-bold text-gray-900 dark:text-white text-lg">스마트 급여 계산</h3>
										<p className="text-gray-500 dark:text-gray-400 text-sm">시급부터 월급까지 자동 계산</p>
									</div>
								</div>
							</div>
							
							<div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transform hover:scale-[1.02] transition-all duration-300 animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
								<div className="flex items-center space-x-4">
									<div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
										<span className="text-white text-xl">📊</span>
									</div>
									<div>
										<h3 className="font-bold text-gray-900 dark:text-white text-lg">근무 기록 관리</h3>
										<p className="text-gray-500 dark:text-gray-400 text-sm">출퇴근 시간을 쉽고 빠르게</p>
									</div>
								</div>
							</div>
							
							<div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transform hover:scale-[1.02] transition-all duration-300 animate-slide-in-left" style={{ animationDelay: '0.4s' }}>
								<div className="flex items-center space-x-4">
									<div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
										<span className="text-white text-xl">📈</span>
									</div>
									<div>
										<h3 className="font-bold text-gray-900 dark:text-white text-lg">수입 인사이트</h3>
										<p className="text-gray-500 dark:text-gray-400 text-sm">월별 통계와 트렌드 분석</p>
									</div>
								</div>
							</div>
						</div>

						{/* 🚀 CTA Button */}
						<div className="space-y-4 animate-slide-in-up" style={{ animationDelay: '0.6s' }}>
							<button
								onClick={handleGoogleLogin}
								className="w-full bg-gradient-to-r from-mint-green to-green-500 text-white py-4 px-6 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-3 group">
								<span className="text-2xl group-hover:scale-110 transition-transform duration-200">🚀</span>
								<span>Google로 시작하기</span>
							</button>
							<p className="text-center text-gray-400 dark:text-gray-500 text-sm">
								로그인하고 나만의 급여 대시보드를 만들어보세요
							</p>
						</div>
					</div>
				) : (
					<>
                        <CalendarView onOpenHourlyRateModal={() => setIsHourlyRateModalOpen(true)} session={session} jobs={jobs} />
                        <Suspense fallback={null}>
                        <HourlyRateSettingModal
							isOpen={isHourlyRateModalOpen}
							onClose={() => {
								setIsHourlyRateModalOpen(false)
                                fetchJobs() // 최신 직업/시급 반영
							}}
							onSaveHourlyRate={saveHourlyRate}
							session={session}
							jobs={jobs}
							fetchJobs={fetchJobs}
                        />
                        </Suspense>
                        <Suspense fallback={null}>
                        <JobManagementModal isOpen={isJobManagementModalOpen} onClose={() => setIsJobManagementModalOpen(false)} session={session} jobs={jobs} fetchJobs={fetchJobs} />
                        </Suspense>
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
