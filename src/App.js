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
		const { error } = await supabase.auth.signOut()
		if (error) console.error("Error logging out:", error.message)
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

            <div className="App bg-cream-white dark:bg-deep-navy min-h-screen flex flex-col items-center justify-center px-3 py-4 pt-16 max-w-[390px] w-full mx-auto">
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
