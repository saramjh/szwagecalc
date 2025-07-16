import React, { useState, useEffect, useCallback } from "react"
import Calendar from "react-calendar"
import moment from "moment"
import { supabase } from "../supabaseClient"
import DailyRecordListModal from "./DailyRecordListModal"
import MonthlyReportModal from "./MonthlyReportModal"
import UsageGuideModal from "./UsageGuideModal"

const CalendarView = ({ onOpenHourlyRateModal, session, jobs }) => {
	const [date, setDate] = useState(new Date())
	const [workRecords, setWorkRecords] = useState([])
	const [isDailyRecordListModalOpen, setIsDailyRecordListModalOpen] = useState(false)
	const [selectedDateForDailyModal, setSelectedDateForDailyModal] = useState(null)
	const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false)
	const [selectedMonthForMonthlyModal, setSelectedMonthForMonthlyModal] = useState(new Date())
	const [isUsageGuideModalOpen, setIsUsageGuideModalOpen] = useState(false)

	const fetchWorkRecords = useCallback(async () => {
		if (!session) return
		const { data, error } = await supabase.from("work_records").select("*, jobs(job_name)").eq("user_id", session.user.id)
		if (error) {
			console.error("Error fetching work records:", error)
		} else {
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
		setIsDailyRecordListModalOpen(true)
	}

	const handleDailyRecordListModalClose = () => {
		setIsDailyRecordListModalOpen(false)
		setSelectedDateForDailyModal(null)
		fetchWorkRecords()
	}

	const handleMonthlyModalOpen = () => {
		setSelectedMonthForMonthlyModal(date)
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

	const getPaydayJobsForDate = (date) => {
		return jobs.filter((job) => {
			if (!job.payday) return false
			const currentYear = date.getFullYear()
			const currentMonth = date.getMonth()
			const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
			const actualPayday = Math.min(job.payday, lastDayOfMonth)
			return date.getDate() === actualPayday
		})
	}

	const tileClassName = ({ date, view }) => {
		if (view === "month") {
			const paydayJobs = getPaydayJobsForDate(date)
			if (paydayJobs.length > 0) {
				return "payday-tile"
			}
		}
		return null
	}

	const tileContent = ({ date, view }) => {
		if (view === "month") {
			const formattedDate = moment(date).format("YYYY-MM-DD")
			const dailyRecords = workRecords.filter((rec) => rec.date === formattedDate)

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
				<div className="absolute -top-1.5 right-1 w-full h-full flex flex-col items-center justify-start pt-1 sm:pt-2 sm:space-y-1">
					{totalHours > 0 && <div className={`text-[0.5rem] sm:text-xs text-white bg-coral-pink rounded-sm w-6 h-3 sm:w-10 sm:h-4 relative left-2 flex items-center justify-center font-semibold`}>{totalHours.toFixed(1)}h</div>}
					{dailyRecords.length > 0 && (
						<div className={`flex relative top-3 left-3 h-2.5 w-2.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-coral-pink-light text-[0.5rem] sm:text-xs sm:top-5 sm:left-4 font-bold text-pink-500 dark:bg-gray-500 dark:text-mint-green z-10`}>{dailyRecords.length}</div>
					)}
				</div>
			)
		}
		return null
	}

	const formatDay = (locale, date) => {
		return moment(date).format("D")
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
		<div className="p-4 relative z-0">
			<Calendar
				onChange={handleDateChange}
				value={date}
				tileContent={tileContent}
				tileClassName={tileClassName}
				formatDay={formatDay}
				weekStartsOn={0}
				locale="ko-KR"
				onActiveStartDateChange={({ activeStartDate }) => setDate(activeStartDate)}
				className="react-calendar-custom border-none rounded-lg shadow-lg p-4 bg-cream-white dark:bg-charcoal-gray"
			/>
			<div className="flex flex-col sm:flex-row sm:space-x-2 mt-4 w-full justify-center">
				<button
					onClick={onOpenHourlyRateModal}
					className="w-full sm:w-auto px-3 py-2 bg-lemon-yellow text-dark-navy rounded-full text-base font-medium shadow-md
                   hover:bg-lemon-yellow focus:outline-none focus:ring-2 focus:ring-lemon-yellow focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105 mb-2 sm:mb-0">
					시급 설정
				</button>
				<button
					onClick={handleMonthlyModalOpen}
					className="w-full sm:w-auto px-3 py-2 bg-mint-green text-white rounded-full text-base font-medium shadow-md
                   hover:bg-mint-green focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105 mb-2 sm:mb-0">
					월급 확인
				</button>
				<button
					onClick={handleOpenUsageGuideModal}
					className="w-full sm:w-auto px-3 py-2 bg-medium-gray text-white rounded-full text-base font-medium shadow-md
                   hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105">
					사용법
				</button>
			</div>
			<DailyRecordListModal selectedDate={selectedDateForDailyModal} isOpen={isDailyRecordListModalOpen} onClose={handleDailyRecordListModalClose} session={session} jobs={jobs} />
			<MonthlyReportModal selectedMonth={selectedMonthForMonthlyModal} isOpen={isMonthlyModalOpen} onClose={handleMonthlyModalClose} session={session} jobs={jobs} />
			<UsageGuideModal isOpen={isUsageGuideModalOpen} onClose={handleCloseUsageGuideModal} manualContent={usageManualContent} />
		</div>
	)
}

export default CalendarView
