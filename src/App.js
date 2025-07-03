import React, { useState, useEffect } from "react"
import CalendarView from "./components/CalendarView"
import HourlyRateSettingModal from "./components/HourlyRateSettingModal"
import HamburgerMenu from "./components/HamburgerMenu" // HamburgerMenu 임포트
import { supabase } from "./supabaseClient"
import moment from "moment"

function App() {
	const [hourlyRate, setHourlyRate] = useState(10000) // Default hourly rate
	const [isHourlyRateModalOpen, setIsHourlyRateModalOpen] = useState(false)
	const [session, setSession] = useState(null)
	const [username, setUsername] = useState(null) // username 상태 추가

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session)
		})

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session)
		})

		return () => subscription.unsubscribe()
	}, [])

	useEffect(() => {
		if (session) {
			fetchHourlyRate()
			fetchProfile() // 프로필 정보 가져오기
		}
	}, [session])

	const fetchProfile = async () => {
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
	}

	const fetchHourlyRate = async () => {
		if (!session) return // 세션이 없으면 시급을 가져오지 않음

		const { data, error } = await supabase
			.from("hourly_rate_history")
			.select("hourly_rate")
			.eq("user_id", session.user.id)
			.is("end_date", null) // end_date가 NULL인 현재 유효한 시급
			.single()

		if (error && error.code !== "PGRST116") {
			// PGRST116 means no data found
			console.error("Error fetching hourly rate:", error)
			setHourlyRate(10000) // 오류 발생 시 기본값으로 설정
		} else if (data) {
			setHourlyRate(data.hourly_rate)
		} else {
			setHourlyRate(10000) // 데이터가 없으면 기본값으로 설정
		}
	}

	const saveHourlyRate = async (newRate) => {
		if (!session) return // 세션이 없으면 저장하지 않음

		const today = moment().format("YYYY-MM-DD")

		// 현재 유효한 시급 기록을 찾아서 end_date를 오늘 전날로 업데이트
		const { data: currentRate, error: fetchError } = await supabase
			.from("hourly_rate_history")
			.select("id, effective_date")
			.eq("user_id", session.user.id)
			.is("end_date", null) // 현재 유효한 시급
			.single()

		if (fetchError && fetchError.code !== "PGRST116") {
			console.error("Error checking current hourly rate:", fetchError)
			return
		}

		if (currentRate) {
			// 기존 시급이 오늘부터 유효한 경우 (수정)
			if (moment(currentRate.effective_date).isSameOrBefore(today)) {
				const { error: updateError } = await supabase
					.from("hourly_rate_history")
					.update({ end_date: moment(today).subtract(1, "days").format("YYYY-MM-DD") })
					.eq("id", currentRate.id)
					.eq("user_id", session.user.id)

				if (updateError) console.error("Error updating previous hourly rate end_date:", updateError)
			}
		}

		// 새로운 시급 기록 삽입
		const { error: insertError } = await supabase.from("hourly_rate_history").insert([{ hourly_rate: newRate, user_id: session.user.id, effective_date: today, end_date: null }])

		if (insertError) console.error("Error inserting new hourly rate:", insertError)

		setHourlyRate(newRate)
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

	return (
		<div className="App bg-cream-white dark:bg-deep-navy min-h-screen flex flex-col items-center justify-center p-4">
			<h1 className="text-dark-navy dark:text-white text-4xl font-bold mb-8">시급이요</h1>
			{session && (
				<div className="absolute top-4 right-4">
					<HamburgerMenu session={session} onLogout={handleLogout} username={username} />
				</div>
			)}
			{!session ? (
				<div className="flex flex-col items-center">
					<p className="text-dark-navy dark:text-white text-lg mb-4">로그인하여 개인화된 서비스를 이용하세요.</p>
					<button
						onClick={handleGoogleLogin}
						className="px-6 py-3 bg-mint-green text-white rounded-lg text-lg font-semibold shadow-md
                       hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50">
						Google 로그인
					</button>
				</div>
			) : (
				<>
					<CalendarView hourlyRate={hourlyRate} onOpenHourlyRateModal={() => setIsHourlyRateModalOpen(true)} session={session} />
					<HourlyRateSettingModal isOpen={isHourlyRateModalOpen} onClose={() => setIsHourlyRateModalOpen(false)} onSaveHourlyRate={saveHourlyRate} currentHourlyRate={hourlyRate} />
				</>
			)}
		</div>
	)
}

export default App
