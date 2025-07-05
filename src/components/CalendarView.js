import React, { useState, useEffect, useCallback } from "react"
import Calendar from "react-calendar"
import moment from "moment"
import { supabase } from "../supabaseClient"
import DailyRecordListModal from "./DailyRecordListModal"
import MonthlyReportModal from "./MonthlyReportModal"
import UsageGuideModal from "./UsageGuideModal" // UsageGuideModal 임포트

const CalendarView = ({ onOpenHourlyRateModal, session, jobs }) => {
	const [date, setDate] = useState(new Date())
	const [workRecords, setWorkRecords] = useState([])
	const [isDailyRecordListModalOpen, setIsDailyRecordListModalOpen] = useState(false) // DailyRecordListModal 상태
	const [selectedDateForDailyModal, setSelectedDateForDailyModal] = useState(null)
	const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false)
	const [selectedMonthForMonthlyModal, setSelectedMonthForMonthlyModal] = useState(new Date())
	const [isUsageGuideModalOpen, setIsUsageGuideModalOpen] = useState(false) // 사용 가이드 모달 상태

	const fetchWorkRecords = useCallback(async () => {
		if (!session) return

		const { data, error } = await supabase
			.from("work_records")
			.select("*, jobs(job_name)") // job_name도 함께 가져오도록 수정
			.eq("user_id", session.user.id)

		if (error) {
			console.error("Error fetching work records:", error)
		} else {
			console.log("Fetched work records:", data)
			setWorkRecords(data)
		}
	}, [session])

	useEffect(() => {
		if (session) {
			fetchWorkRecords()
		}
	}, [session, fetchWorkRecords])

	const handleDateChange = (newDate) => {
		setDate(newDate)
		setSelectedDateForDailyModal(newDate)
		setIsDailyRecordListModalOpen(true) // DailyRecordListModal 열기
	}

	const handleDailyRecordListModalClose = () => {
		setIsDailyRecordListModalOpen(false)
		setSelectedDateForDailyModal(null)
		fetchWorkRecords() // 목록 모달 닫을 때 근무 기록 새로고침
	}

	const handleMonthlyModalOpen = () => {
		setSelectedMonthForMonthlyModal(date) // 현재 달력을 보고 있는 달을 기준으로 설정
		setIsMonthlyModalOpen(true)
	}

	const handleMonthlyModalClose = () => {
		setIsMonthlyModalOpen(false)
	}

	const handleOpenUsageGuideModal = () => {
		setIsUsageGuideModalOpen(true)
	}

	const handleCloseUsageGuideModal = () => {
		setIsUsageGuideModalOpen(false)
	}

	// 각 날짜에 근무 시간 표시 (예시)
	const tileContent = ({ date, view }) => {
		if (view === "month") {
			const formattedDate = moment(date).format("YYYY-MM-DD")
			const dailyRecords = workRecords.filter((rec) => rec.date === formattedDate)

			if (dailyRecords.length > 0) {
				let totalHours = 0
				dailyRecords.forEach((record) => {
					if (record.start_time && record.end_time) {
						const start = moment(record.start_time, "HH:mm")
						const end = moment(record.end_time, "HH:mm")
						let duration = moment.duration(end.diff(start))
						if (end.isBefore(start)) {
							duration = moment.duration(end.add(1, "day").diff(start))
						}
						totalHours += duration.asHours()
					}
				})

				return (
					<div className="relative w-full h-full">
						{" "}
						{totalHours > 0 && <div className="absolute -top-6 -right-2 text-[0.5rem] text-white bg-coral-pink rounded-sm w-8 h-3 flex items-center justify-center font-semibold -mt-1 -mr-1">{totalHours.toFixed(1)}h</div>}
						{dailyRecords.length > 1 && <div className="absolute bottom-9 -left-1 w-2 h-2 rounded-full bg-mint-green animate-pulse"></div>}
					</div>
				)
			}
		}
		return null
	}

	const usageManualContent = `1. 직업 설정:
햄버거 메뉴(☰) > '직업 관리'에서 나의 직업을 추가하세요.

2. 시급 설정:
'시급 설정' 버튼을 눌러 직업별 시급과 적용 시작일을 설정하세요.

3. 근무 기록:
달력에서 날짜를 선택하여 근무 기록을 추가하고 관리하세요.

4. 월급 확인:
'월급 확인' 버튼을 눌러 월별 근무 보고서를 확인하세요.`

	return (
		<div className="p-4">
			<Calendar
				onChange={handleDateChange}
				value={date}
				tileContent={tileContent}
				weekStartsOn={0}
				locale="en-US"
				onActiveStartDateChange={({ activeStartDate }) => setDate(activeStartDate)}
				className="react-calendar-custom border-none rounded-lg shadow-lg p-4 bg-cream-white dark:bg-charcoal-gray"
			/>
			<button
				onClick={onOpenHourlyRateModal}
				className="w-full mt-4 px-4 py-3 bg-lemon-yellow text-dark-navy rounded-lg text-lg font-semibold shadow-md
                   hover:bg-lemon-yellow focus:outline-none focus:ring-2 focus:ring-lemon-yellow focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105">
				시급 설정
			</button>
			<button
				onClick={handleMonthlyModalOpen}
				className="w-full mt-2 px-4 py-3 bg-mint-green text-white rounded-lg text-lg font-semibold shadow-md
                   hover:bg-mint-green focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105">
				월급 확인
			</button>
			<button
				onClick={handleOpenUsageGuideModal}
				className="w-full mt-2 px-4 py-3 bg-medium-gray text-white rounded-lg text-lg font-semibold shadow-md
                   hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105">
				사용법
			</button>
			<DailyRecordListModal selectedDate={selectedDateForDailyModal} isOpen={isDailyRecordListModalOpen} onClose={handleDailyRecordListModalClose} session={session} jobs={jobs} />
			<MonthlyReportModal selectedMonth={selectedMonthForMonthlyModal} isOpen={isMonthlyModalOpen} onClose={handleMonthlyModalClose} session={session} jobs={jobs} />
			<UsageGuideModal isOpen={isUsageGuideModalOpen} onClose={handleCloseUsageGuideModal} manualContent={usageManualContent} />
		</div>
	)
}

export default CalendarView
