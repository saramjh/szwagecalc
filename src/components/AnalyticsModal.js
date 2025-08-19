import React, { useState, useEffect, useMemo } from "react"
import dayjs from "dayjs"
// 🚀 트리셰이킹 최적화: 필요한 아이콘만 import
import { X, TrendingUp, Clock, DollarSign, Calendar, BarChart3, PieChart, Target, Activity, ArrowUp, ArrowDown, Minus, Zap, Timer, Award, Lightbulb, AlertTriangle } from "lucide-react"
import { useToast } from "../contexts/ToastContext"

const AnalyticsModal = ({ isOpen, onClose, workRecords, jobs, session }) => {
	const showToast = useToast()
	const [selectedPeriod, setSelectedPeriod] = useState("3months") // 3months, 6months, 1year
	const [selectedTab, setSelectedTab] = useState("overview") // overview, income, productivity, insights
	const [showModal, setShowModal] = useState(false)
	const [animateModal, setAnimateModal] = useState(false)

	useEffect(() => {
		if (isOpen) {
			setShowModal(true)
			setTimeout(() => setAnimateModal(true), 10)
			document.body.classList.add('modal-open') // 🎯 헤더 숨기기
		} else {
			setAnimateModal(false)
			setTimeout(() => setShowModal(false), 300)
			document.body.classList.remove('modal-open') // 🎯 헤더 복원
		}
	}, [isOpen])

	// 🧹 컴포넌트 언마운트 시 클린업
	useEffect(() => {
		return () => {
			document.body.classList.remove('modal-open')
		}
	}, [])

	// 📊 기간별 데이터 필터링
	const filteredRecords = useMemo(() => {
		const now = dayjs()
		let startDate
		
		switch (selectedPeriod) {
			case "3months":
				startDate = now.subtract(3, 'month').startOf('month')
				break
			case "6months":
				startDate = now.subtract(6, 'month').startOf('month')
				break
			case "1year":
				startDate = now.subtract(1, 'year').startOf('month')
				break
			default:
				startDate = now.subtract(3, 'month').startOf('month')
		}
		
		return workRecords.filter(record => 
			dayjs(record.date).isAfter(startDate, 'day') || dayjs(record.date).isSame(startDate, 'day')
		)
	}, [workRecords, selectedPeriod])

	// 📈 월별 수입 트렌드 계산
	const monthlyTrends = useMemo(() => {
		const months = {}
		
		filteredRecords.forEach(record => {
			const monthKey = dayjs(record.date).format('YYYY-MM')
			if (!months[monthKey]) {
				months[monthKey] = {
					month: monthKey,
					income: 0,
					hours: 0,
					workDays: new Set(),
					records: 0
				}
			}
			
			months[monthKey].income += record.daily_wage || 0
			months[monthKey].records += 1
			months[monthKey].workDays.add(record.date)
			
			if (record.start_time && record.end_time) {
				const start = dayjs(`2000-01-01 ${record.start_time}`)
				let end = dayjs(`2000-01-01 ${record.end_time}`)
				if (end.isBefore(start)) end = end.add(1, 'day')
				months[monthKey].hours += end.diff(start, 'minute') / 60
			}
		})
		
		return Object.values(months)
			.map(m => ({ ...m, workDays: m.workDays.size }))
			.sort((a, b) => a.month.localeCompare(b.month))
	}, [filteredRecords])

	// 🎯 직업별 성과 분석
	const jobAnalytics = useMemo(() => {
		const jobStats = {}
		
		filteredRecords.forEach(record => {
			const jobId = record.job_id
			const jobName = record.jobs?.job_name || '직업 미설정'
			
			if (!jobStats[jobId]) {
				jobStats[jobId] = {
					jobName,
					totalIncome: 0,
					totalHours: 0,
					workDays: new Set(),
					records: 0,
					avgHourlyRate: 0
				}
			}
			
			jobStats[jobId].totalIncome += record.daily_wage || 0
			jobStats[jobId].records += 1
			jobStats[jobId].workDays.add(record.date)
			
			if (record.start_time && record.end_time) {
				const start = dayjs(`2000-01-01 ${record.start_time}`)
				let end = dayjs(`2000-01-01 ${record.end_time}`)
				if (end.isBefore(start)) end = end.add(1, 'day')
				jobStats[jobId].totalHours += end.diff(start, 'minute') / 60
			}
		})
		
		return Object.values(jobStats)
			.map(job => ({
				...job,
				workDays: job.workDays.size,
				avgHourlyRate: job.totalHours > 0 ? Math.round(job.totalIncome / job.totalHours) : 0
			}))
			.sort((a, b) => b.totalIncome - a.totalIncome)
	}, [filteredRecords])

	// 📊 전체 통계 요약
	const overallStats = useMemo(() => {
		const totalIncome = filteredRecords.reduce((sum, r) => sum + (r.daily_wage || 0), 0)
		const totalHours = filteredRecords.reduce((sum, r) => {
			if (!r.start_time || !r.end_time) return sum
			const start = dayjs(`2000-01-01 ${r.start_time}`)
			let end = dayjs(`2000-01-01 ${r.end_time}`)
			if (end.isBefore(start)) end = end.add(1, 'day')
			return sum + end.diff(start, 'minute') / 60
		}, 0)
		
		const uniqueWorkDays = new Set(filteredRecords.map(r => r.date)).size
		const avgDailyIncome = uniqueWorkDays > 0 ? totalIncome / uniqueWorkDays : 0
		const avgHourlyRate = totalHours > 0 ? totalIncome / totalHours : 0
		
		return {
			totalIncome,
			totalHours,
			totalRecords: filteredRecords.length,
			uniqueWorkDays,
			avgDailyIncome,
			avgHourlyRate
		}
	}, [filteredRecords])

	// 📈 수입 트렌드 분석
	const incomeAnalysis = useMemo(() => {
		if (monthlyTrends.length < 2) return { trend: 'stable', change: 0, changePercent: 0 }
		
		const latest = monthlyTrends[monthlyTrends.length - 1]
		const previous = monthlyTrends[monthlyTrends.length - 2]
		
		const change = latest.income - previous.income
		const changePercent = previous.income > 0 ? (change / previous.income) * 100 : 0
		
		let trend = 'stable'
		if (changePercent > 5) trend = 'up'
		else if (changePercent < -5) trend = 'down'
		
		return { trend, change, changePercent }
	}, [monthlyTrends])

	// 📊 요일별 수입 패턴 분석
	const weekdayAnalysis = useMemo(() => {
		const weekdays = Array(7).fill(0).map((_, i) => ({
			day: i,
			dayName: ['일', '월', '화', '수', '목', '금', '토'][i],
			income: 0,
			hours: 0,
			count: 0
		}))
		
		filteredRecords.forEach(record => {
			const dayOfWeek = dayjs(record.date).day()
			weekdays[dayOfWeek].income += record.daily_wage || 0
			weekdays[dayOfWeek].count += 1
			
			if (record.start_time && record.end_time) {
				const start = dayjs(`2000-01-01 ${record.start_time}`)
				let end = dayjs(`2000-01-01 ${record.end_time}`)
				if (end.isBefore(start)) end = end.add(1, 'day')
				weekdays[dayOfWeek].hours += end.diff(start, 'minute') / 60
			}
		})
		
		return weekdays.map(day => ({
			...day,
			avgIncome: day.count > 0 ? day.income / day.count : 0,
			avgHours: day.count > 0 ? day.hours / day.count : 0
		}))
	}, [filteredRecords])

	// ⚡ 생산성 분석
	const productivityAnalysis = useMemo(() => {
		// 근무 효율성 계산
		const workingSessions = filteredRecords.filter(r => r.start_time && r.end_time)
		
		// 평균 근무 세션 길이
		const avgSessionLength = workingSessions.length > 0 
			? workingSessions.reduce((sum, r) => {
				const start = dayjs(`2000-01-01 ${r.start_time}`)
				let end = dayjs(`2000-01-01 ${r.end_time}`)
				if (end.isBefore(start)) end = end.add(1, 'day')
				return sum + end.diff(start, 'minute') / 60
			}, 0) / workingSessions.length 
			: 0

		// 시간대별 생산성 (시간당 수입)
		const hourlyProductivity = Array(24).fill(0).map((_, hour) => ({
			hour,
			income: 0,
			sessions: 0,
			totalHours: 0
		}))
		
		workingSessions.forEach(record => {
			const startHour = parseInt(record.start_time.split(':')[0])
			const income = record.daily_wage || 0
			const start = dayjs(`2000-01-01 ${record.start_time}`)
			let end = dayjs(`2000-01-01 ${record.end_time}`)
			if (end.isBefore(start)) end = end.add(1, 'day')
			const duration = end.diff(start, 'minute') / 60
			
			hourlyProductivity[startHour].income += income
			hourlyProductivity[startHour].sessions += 1
			hourlyProductivity[startHour].totalHours += duration
		})
		
		// 가장 생산적인 시간대 찾기
		const bestHour = hourlyProductivity.reduce((best, current, index) => {
			const productivity = current.totalHours > 0 ? current.income / current.totalHours : 0
			const bestProductivity = best.totalHours > 0 ? best.income / best.totalHours : 0
			return productivity > bestProductivity ? { ...current, hour: index } : best
		}, { income: 0, totalHours: 0, hour: 0 })

		// 근무 일관성 계산 (연속 근무일)
		const sortedDates = [...new Set(filteredRecords.map(r => r.date))].sort()
		let maxStreak = 0
		let currentStreak = 0
		
		for (let i = 0; i < sortedDates.length; i++) {
			if (i === 0) {
				currentStreak = 1
			} else {
				const prevDate = dayjs(sortedDates[i-1])
				const currentDate = dayjs(sortedDates[i])
				if (currentDate.diff(prevDate, 'day') === 1) {
					currentStreak++
				} else {
					maxStreak = Math.max(maxStreak, currentStreak)
					currentStreak = 1
				}
			}
		}
		maxStreak = Math.max(maxStreak, currentStreak)

		return {
			avgSessionLength,
			bestHour,
			maxStreak,
			totalSessions: workingSessions.length,
			consistency: sortedDates.length > 0 ? (maxStreak / sortedDates.length) * 100 : 0
		}
	}, [filteredRecords])

	// 🧠 스마트 인사이트 생성
	const smartInsights = useMemo(() => {
		const insights = []
		
		// 수입 트렌드 인사이트
		if (incomeAnalysis.trend === 'up' && incomeAnalysis.changePercent > 10) {
			insights.push({
				type: 'positive',
				icon: TrendingUp,
				title: '수입이 크게 증가했어요!',
				message: `전월 대비 ${incomeAnalysis.changePercent.toFixed(1)}% 증가했습니다. 이 추세를 유지해보세요.`,
				action: '월별 비교 보기'
			})
		} else if (incomeAnalysis.trend === 'down' && incomeAnalysis.changePercent < -10) {
			insights.push({
				type: 'warning',
				icon: AlertTriangle,
				title: '수입이 감소했네요',
				message: `전월 대비 ${Math.abs(incomeAnalysis.changePercent).toFixed(1)}% 감소했습니다. 근무 시간을 늘려보시는 건 어떨까요?`,
				action: '생산성 분석 보기'
			})
		}

		// 생산성 인사이트
		if (productivityAnalysis.consistency > 80) {
			insights.push({
				type: 'positive',
				icon: Award,
				title: '근무 일관성이 뛰어나요!',
				message: `${productivityAnalysis.consistency.toFixed(0)}%의 높은 일관성을 보여주고 있습니다. 훌륭해요!`,
				action: '패턴 분석 보기'
			})
		} else if (productivityAnalysis.consistency < 50) {
			insights.push({
				type: 'tip',
				icon: Target,
				title: '근무 패턴을 규칙적으로 만들어보세요',
				message: '일정한 근무 패턴이 수입 안정성에 도움이 됩니다.',
				action: '생산성 팁 보기'
			})
		}

		// 최고 생산성 시간 인사이트
		if (productivityAnalysis.bestHour.sessions > 2) {
			const hourText = productivityAnalysis.bestHour.hour < 12 
				? `오전 ${productivityAnalysis.bestHour.hour}시` 
				: `오후 ${productivityAnalysis.bestHour.hour - 12}시`
			insights.push({
				type: 'tip',
				icon: Zap,
				title: `${hourText}가 가장 생산적이에요`,
				message: `이 시간대에 시간당 ${Math.round(productivityAnalysis.bestHour.totalHours > 0 
					? productivityAnalysis.bestHour.income / productivityAnalysis.bestHour.totalHours 
					: 0
				).toLocaleString()}원을 벌고 있습니다.`,
				action: '시간대 분석 보기'
			})
		}

		// 요일별 패턴 인사이트
		const bestWeekday = weekdayAnalysis.reduce((best, current) => 
			current.avgIncome > best.avgIncome ? current : best
		, weekdayAnalysis[0])
		
		if (bestWeekday.count > 0) {
			insights.push({
				type: 'tip',
				icon: Calendar,
				title: `${bestWeekday.dayName}요일이 가장 수익성이 좋아요`,
				message: `평균 ${Math.round(bestWeekday.avgIncome).toLocaleString()}원을 벌고 있습니다.`,
				action: '요일별 분석 보기'
			})
		}

		// 데이터 부족 시 기본 인사이트
		if (insights.length === 0) {
			insights.push({
				type: 'tip',
				icon: Lightbulb,
				title: '더 많은 데이터가 쌓이면 개인화된 인사이트를 제공해드려요',
				message: '꾸준히 근무 기록을 입력하시면 맞춤형 분석과 조언을 받을 수 있습니다.',
				action: '근무 기록하기'
			})
		}

		return insights
	}, [incomeAnalysis, productivityAnalysis, weekdayAnalysis])

	if (!showModal) return null

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} z-layer-modal p-2 sm:p-4`}>
			<div className={`bg-cream-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/50 w-full max-w-[390px] sm:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}>
				
				{/* 🎨 Etos 스타일 헤더 - 모바일 최적화 */}
				<div className="relative bg-gradient-to-r from-mint-green to-emerald-500 text-white p-4 sm:p-6 flex-shrink-0">
					<div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-white opacity-10 rounded-full -mr-10 sm:-mr-16 -mt-10 sm:-mt-16"></div>
					<div className="relative z-10 flex justify-between items-center">
						<div>
							<h2 className="text-lg sm:text-2xl font-bold break-keep flex items-center">
								<Activity className="w-5 h-5 sm:w-6 sm:h-6 mr-2 flex-shrink-0" />
								데이터 인사이트
							</h2>
							<p className="text-mint-100 text-xs sm:text-sm mt-1 break-keep">당신의 근무 패턴을 한눈에</p>
						</div>
						<button
							onClick={onClose}
							className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors flex-shrink-0"
						>
							<X size={20} className="sm:w-6 sm:h-6" />
						</button>
					</div>
				</div>

				{/* 🎯 기간 선택 - 모바일 최적화 */}
				<div className="bg-gray-50 dark:bg-gray-800 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
					<div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
						{[
							{ key: "3months", label: "3개월", fullLabel: "최근 3개월" },
							{ key: "6months", label: "6개월", fullLabel: "최근 6개월" },
							{ key: "1year", label: "1년", fullLabel: "최근 1년" }
						].map(period => (
							<button
								key={period.key}
								onClick={() => setSelectedPeriod(period.key)}
								className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
									selectedPeriod === period.key
										? 'bg-mint-green text-white shadow'
										: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
								}`}
							>
								<span className="sm:hidden">{period.label}</span>
								<span className="hidden sm:inline">{period.fullLabel}</span>
							</button>
						))}
					</div>
				</div>

				{/* 📊 탭 네비게이션 - 모바일 최적화 */}
				<div className="bg-white dark:bg-gray-800 px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
					<div className="flex space-x-1 overflow-x-auto">
						{[
							{ key: "overview", label: "개요", mobileLabel: "개요", icon: BarChart3 },
							{ key: "income", label: "수입 분석", mobileLabel: "수입", icon: DollarSign },
							{ key: "productivity", label: "생산성", mobileLabel: "생산성", icon: TrendingUp },
							{ key: "insights", label: "인사이트", mobileLabel: "팁", icon: Target }
						].map(tab => {
							const Icon = tab.icon
							return (
								<button
									key={tab.key}
									onClick={() => setSelectedTab(tab.key)}
									className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
										selectedTab === tab.key
											? 'bg-mint-green text-white'
											: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
									}`}
								>
									<Icon size={14} className="sm:w-4 sm:h-4" />
									<span className="sm:hidden">{tab.mobileLabel}</span>
									<span className="hidden sm:inline">{tab.label}</span>
								</button>
							)
						})}
					</div>
				</div>

				{/* 📈 컨텐츠 영역 - 모바일 최적화 */}
				<div className="flex-1 overflow-y-auto p-3 sm:p-6">
					{selectedTab === "overview" && (
						<div className="space-y-4 sm:space-y-6">
							{/* 전체 요약 카드 - 모바일에서 2x2 그리드 */}
							<div className="grid grid-cols-2 gap-3 sm:gap-4">
								<div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow">
									<div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
										<div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900 rounded-lg flex-shrink-0">
											<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
										</div>
										<div className="text-center sm:text-left">
											<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">총 수입</p>
											<p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
												{overallStats.totalIncome.toLocaleString()}원
											</p>
										</div>
									</div>
								</div>

								<div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow">
									<div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
										<div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
											<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
										</div>
										<div className="text-center sm:text-left">
											<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">총 근무시간</p>
											<p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
												{overallStats.totalHours.toFixed(1)}h
											</p>
										</div>
									</div>
								</div>

								<div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow">
									<div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
										<div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900 rounded-lg flex-shrink-0">
											<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
										</div>
										<div className="text-center sm:text-left">
											<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">근무일수</p>
											<p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
												{overallStats.uniqueWorkDays}일
											</p>
										</div>
									</div>
								</div>

								<div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow">
									<div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
										<div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900 rounded-lg flex-shrink-0">
											<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
										</div>
										<div className="text-center sm:text-left">
											<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">평균 시급</p>
											<p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
												{Math.floor(overallStats.avgHourlyRate).toLocaleString()}원
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* 월별 트렌드 차트 - 모바일 최적화 */}
							<div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center break-keep">
									<BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-mint-green flex-shrink-0" />
									월별 수입 트렌드
								</h3>
								<div className="space-y-2 sm:space-y-3">
									{monthlyTrends.map((month, index) => {
										const maxIncome = Math.max(...monthlyTrends.map(m => m.income), 1)
										const widthPercent = (month.income / maxIncome) * 100
										
										return (
											<div key={month.month} className="flex items-center space-x-2 sm:space-x-3">
												<div className="w-10 sm:w-16 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
													{dayjs(month.month).format('M월')}
												</div>
												<div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-5 sm:h-6 relative min-w-0">
													<div 
														className="bg-gradient-to-r from-mint-green to-emerald-500 h-5 sm:h-6 rounded-full transition-all duration-500 ease-out"
														style={{ width: `${widthPercent}%` }}
													></div>
													<div className="absolute inset-0 flex items-center justify-center text-xs px-1">
														<span className="truncate text-white drop-shadow-lg" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
															{month.income.toLocaleString()}원
														</span>
													</div>
												</div>
												<div className="w-12 sm:w-20 text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-right flex-shrink-0">
													{month.hours.toFixed(1)}h
												</div>
											</div>
										)
									})}
								</div>
							</div>

							{/* 직업별 성과 비교 - 모바일 최적화 */}
							<div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center break-keep">
									<PieChart className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-mint-green flex-shrink-0" />
									직업별 성과 비교
								</h3>
								<div className="space-y-3 sm:space-y-4">
									{jobAnalytics.map((job, index) => {
										const colors = ['bg-mint-green', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
										const color = colors[index % colors.length]
										
										return (
											<div key={job.jobName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
												<div className="flex items-center justify-between mb-2 sm:mb-3">
													<div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
														<div className={`w-3 h-3 sm:w-4 sm:h-4 ${color} rounded-full flex-shrink-0`}></div>
														<h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate break-keep">{job.jobName}</h4>
													</div>
													<div className="text-right flex-shrink-0">
														<p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">
															{job.totalIncome.toLocaleString()}원
														</p>
														<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
															{job.avgHourlyRate.toLocaleString()}원/h
														</p>
													</div>
												</div>
												<div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
													<div>
														<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-keep">근무시간</p>
														<p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{job.totalHours.toFixed(1)}h</p>
													</div>
													<div>
														<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-keep">근무일수</p>
														<p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{job.workDays}일</p>
													</div>
													<div>
														<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-keep">기록수</p>
														<p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">{job.records}회</p>
													</div>
												</div>
											</div>
										)
									})}
								</div>
							</div>
						</div>
					)}

					{selectedTab === "income" && (
						<div className="space-y-4 sm:space-y-6">
							{/* 📈 수입 트렌드 요약 카드 */}
							<div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center break-keep">
									<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-mint-green flex-shrink-0" />
									수입 트렌드
								</h3>
								
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
									{/* 전월 대비 변화 */}
									<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">전월 대비</span>
											{incomeAnalysis.trend === 'up' ? (
												<ArrowUp className="w-4 h-4 text-green-500" />
											) : incomeAnalysis.trend === 'down' ? (
												<ArrowDown className="w-4 h-4 text-red-500" />
											) : (
												<Minus className="w-4 h-4 text-gray-400" />
											)}
										</div>
										<div className={`text-sm sm:text-base font-bold ${
											incomeAnalysis.trend === 'up' ? 'text-green-600 dark:text-green-400' :
											incomeAnalysis.trend === 'down' ? 'text-red-600 dark:text-red-400' :
											'text-gray-600 dark:text-gray-400'
										}`}>
											{incomeAnalysis.changePercent > 0 ? '+' : ''}{incomeAnalysis.changePercent.toFixed(1)}%
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{incomeAnalysis.change > 0 ? '+' : ''}{incomeAnalysis.change.toLocaleString()}원
										</div>
									</div>
									
									{/* 일평균 수입 */}
									<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">일평균 수입</span>
											<Calendar className="w-4 h-4 text-blue-500" />
										</div>
										<div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
											{Math.round(overallStats.avgDailyIncome).toLocaleString()}원
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{overallStats.uniqueWorkDays}일 근무
										</div>
									</div>
									
									{/* 시간당 수입 */}
									<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
										<div className="flex items-center justify-between mb-2">
											<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">시간당 수입</span>
											<Clock className="w-4 h-4 text-purple-500" />
										</div>
										<div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
											{Math.round(overallStats.avgHourlyRate).toLocaleString()}원
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{overallStats.totalHours.toFixed(1)}시간
										</div>
									</div>
								</div>
							</div>

							{/* 📊 요일별 수입 패턴 */}
							<div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center break-keep">
									<Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-mint-green flex-shrink-0" />
									요일별 수입 패턴
								</h3>
								
								<div className="space-y-2 sm:space-y-3">
									{weekdayAnalysis.map((day) => {
										const maxIncome = Math.max(...weekdayAnalysis.map(d => d.income), 1)
										const widthPercent = (day.income / maxIncome) * 100
										
										return (
											<div key={day.day} className="flex items-center space-x-2 sm:space-x-3">
												<div className="w-6 sm:w-8 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
													{day.dayName}
												</div>
												<div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 sm:h-5 relative min-w-0">
													<div 
														className={`h-4 sm:h-5 rounded-full transition-all duration-500 ease-out ${
															day.day === 0 || day.day === 6 
																? 'bg-gradient-to-r from-coral-pink to-pink-500' 
																: 'bg-gradient-to-r from-mint-green to-emerald-500'
														}`}
														style={{ width: `${widthPercent}%` }}
													></div>
													{day.income > 0 && (
														<div className="absolute inset-0 flex items-center justify-center text-xs px-1">
															<span className="truncate text-white drop-shadow-lg" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
																{day.income.toLocaleString()}원
															</span>
														</div>
													)}
												</div>
												<div className="w-12 sm:w-16 text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-right flex-shrink-0">
													{day.count}일
												</div>
											</div>
										)
									})}
								</div>
							</div>

							{/* 📊 월별 상세 비교 */}
							<div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center break-keep">
									<BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-mint-green flex-shrink-0" />
									월별 상세 비교
								</h3>
								
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
									{monthlyTrends.slice(-4).map((month, index) => (
										<div key={month.month} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
											<div className="flex items-center justify-between mb-2">
												<h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
													{dayjs(month.month).format('M월')}
												</h4>
												<div className="text-right">
													<div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
														{month.income.toLocaleString()}원
													</div>
												</div>
											</div>
											<div className="grid grid-cols-2 gap-2 text-center">
												<div>
													<p className="text-xs text-gray-500 dark:text-gray-400 break-keep">근무시간</p>
													<p className="text-sm font-semibold text-gray-900 dark:text-white">{month.hours.toFixed(1)}h</p>
												</div>
												<div>
													<p className="text-xs text-gray-500 dark:text-gray-400 break-keep">근무일</p>
													<p className="text-sm font-semibold text-gray-900 dark:text-white">{month.workDays}일</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{selectedTab === "productivity" && (
						<div className="space-y-4 sm:space-y-6">
							{/* ⚡ 생산성 요약 카드 */}
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
								{/* 평균 세션 길이 */}
								<div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow">
									<div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
										<div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
											<Timer className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
										</div>
										<div className="text-center sm:text-left">
											<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">평균 세션</p>
											<p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
												{productivityAnalysis.avgSessionLength.toFixed(1)}h
											</p>
										</div>
									</div>
								</div>

								{/* 최고 연속 근무일 */}
								<div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow">
									<div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
										<div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900 rounded-lg flex-shrink-0">
											<Award className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
										</div>
										<div className="text-center sm:text-left">
											<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">최고 연속</p>
											<p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
												{productivityAnalysis.maxStreak}일
											</p>
										</div>
									</div>
								</div>

								{/* 근무 일관성 */}
								<div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow col-span-2 sm:col-span-1">
									<div className="flex flex-col sm:flex-row items-center sm:space-x-3 space-y-2 sm:space-y-0">
										<div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900 rounded-lg flex-shrink-0">
											<Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
										</div>
										<div className="text-center sm:text-left">
											<p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-keep">일관성</p>
											<p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
												{productivityAnalysis.consistency.toFixed(0)}%
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* 🕐 최고 생산성 시간대 */}
							<div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center break-keep">
									<Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-mint-green flex-shrink-0" />
									최고 생산성 시간대
								</h3>
								
								<div className="bg-gradient-to-r from-mint-green/10 to-emerald-500/10 dark:from-mint-green/20 dark:to-emerald-500/20 rounded-lg p-4 border border-mint-green/20">
									<div className="text-center">
										<div className="text-2xl sm:text-3xl font-bold text-mint-green dark:text-mint-green-dark mb-2">
											{productivityAnalysis.bestHour.hour.toString().padStart(2, '0')}:00
										</div>
										<div className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-1">
											시간당 {Math.round(productivityAnalysis.bestHour.totalHours > 0 
												? productivityAnalysis.bestHour.income / productivityAnalysis.bestHour.totalHours 
												: 0
											).toLocaleString()}원
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{productivityAnalysis.bestHour.sessions}회 근무
										</div>
									</div>
								</div>
							</div>

							{/* 📊 근무 패턴 분석 */}
							<div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center break-keep">
									<BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-mint-green flex-shrink-0" />
									근무 패턴 분석
								</h3>
								
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* 근무 세션 통계 */}
									<div className="space-y-3">
										<h4 className="font-medium text-gray-900 dark:text-white text-sm">근무 세션 정보</h4>
										<div className="space-y-2">
											<div className="flex justify-between items-center">
												<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">총 세션 수</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-white">
													{productivityAnalysis.totalSessions}회
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">평균 길이</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-white">
													{productivityAnalysis.avgSessionLength.toFixed(1)}시간
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">최고 연속</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-white">
													{productivityAnalysis.maxStreak}일
												</span>
											</div>
										</div>
									</div>
									
									{/* 효율성 지표 */}
									<div className="space-y-3">
										<h4 className="font-medium text-gray-900 dark:text-white text-sm">효율성 지표</h4>
										<div className="space-y-2">
											<div className="flex justify-between items-center">
												<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">근무 일관성</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-white">
													{productivityAnalysis.consistency.toFixed(0)}%
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">시간당 수입</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-white">
													{Math.round(overallStats.avgHourlyRate).toLocaleString()}원
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">일평균 수입</span>
												<span className="text-sm font-semibold text-gray-900 dark:text-white">
													{Math.round(overallStats.avgDailyIncome).toLocaleString()}원
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{selectedTab === "insights" && (
						<div className="space-y-4 sm:space-y-6">
							{/* 🧠 인사이트 카드들 */}
							<div className="space-y-3 sm:space-y-4">
								{smartInsights.map((insight, index) => {
									const Icon = insight.icon
									const bgColor = insight.type === 'positive' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
													insight.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
													'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
									
									const iconColor = insight.type === 'positive' ? 'text-green-600 dark:text-green-400' :
													insight.type === 'warning' ? 'text-orange-600 dark:text-orange-400' :
													'text-blue-600 dark:text-blue-400'

									return (
										<div key={index} className={`${bgColor} border rounded-xl p-4 sm:p-5`}>
											<div className="flex items-start space-x-3 sm:space-x-4">
												<div className="flex-shrink-0">
													<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
														<Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${iconColor}`} />
													</div>
												</div>
												<div className="flex-1 min-w-0">
													<h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base break-keep mb-1">
														{insight.title}
													</h3>
													<p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm break-keep leading-relaxed mb-3">
														{insight.message}
													</p>
													<button 
														onClick={() => {
															// 🎯 실제 기능 구현: 관련 탭으로 이동하고 피드백 제공
															if (insight.action.includes('월별') || insight.action.includes('수입')) {
																setSelectedTab('income')
																showToast('수입 분석 탭으로 이동했습니다', 'success')
															} else if (insight.action.includes('생산성') || insight.action.includes('패턴')) {
																setSelectedTab('productivity')
																showToast('생산성 분석 탭으로 이동했습니다', 'success')
															} else if (insight.action.includes('시간대')) {
																setSelectedTab('productivity')
																showToast('최고 생산성 시간대를 확인해보세요!', 'info')
															} else if (insight.action.includes('요일별')) {
																setSelectedTab('income')
																showToast('요일별 수입 패턴을 확인해보세요!', 'info')
															} else {
																// 기본 액션들
																if (insight.action.includes('근무 기록')) {
																	onClose() // 모달 닫고 메인 화면으로
																	showToast('캘린더에서 날짜를 선택해 근무를 기록하세요', 'info')
																}
															}
														}}
														className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
															insight.type === 'positive' ? 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700' :
															insight.type === 'warning' ? 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-700' :
															'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700'
														}`}
													>
														{insight.action}
													</button>
												</div>
											</div>
										</div>
									)
								})}
							</div>

							{/* 🎯 개선 제안 */}
							<div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow">
								<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center break-keep">
									<Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-mint-green flex-shrink-0" />
									개선 제안
								</h3>
								
								<div className="space-y-3">
									{/* 수입 목표 */}
									<div className="flex items-start space-x-3">
										<div className="w-6 h-6 bg-mint-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
											<DollarSign className="w-3 h-3 text-mint-green" />
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-medium text-gray-900 dark:text-white text-sm break-keep">
												다음 달 수입 목표: {Math.round(overallStats.avgDailyIncome * 25).toLocaleString()}원
											</h4>
											<p className="text-xs text-gray-600 dark:text-gray-400 break-keep leading-relaxed">
												현재 일평균 수입 기준으로 25일 근무 시 예상 수입입니다.
											</p>
										</div>
									</div>

									{/* 시간 최적화 */}
									<div className="flex items-start space-x-3">
										<div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
											<Clock className="w-3 h-3 text-blue-500" />
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-medium text-gray-900 dark:text-white text-sm break-keep">
												최적 근무시간: {productivityAnalysis.avgSessionLength.toFixed(1)}시간 세션
											</h4>
											<p className="text-xs text-gray-600 dark:text-gray-400 break-keep leading-relaxed">
												현재 평균 세션 길이가 가장 효율적인 것 같습니다.
											</p>
										</div>
									</div>

									{/* 일관성 개선 */}
									{productivityAnalysis.consistency < 70 && (
										<div className="flex items-start space-x-3">
											<div className="w-6 h-6 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
												<Zap className="w-3 h-3 text-purple-500" />
											</div>
											<div className="flex-1 min-w-0">
												<h4 className="font-medium text-gray-900 dark:text-white text-sm break-keep">
													규칙적인 근무 패턴 만들기
												</h4>
												<p className="text-xs text-gray-600 dark:text-gray-400 break-keep leading-relaxed">
													주 3-4회 이상 꾸준히 근무하면 수입이 더 안정적이 됩니다.
												</p>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* 액션 버튼 - 모바일 최적화 */}
				<div className="bg-gray-50 dark:bg-gray-800 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
					<button
						onClick={onClose}
						className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm sm:text-base"
					>
						닫기
					</button>
					<button 
						onClick={() => {
							// 🎯 통계 리포트 CSV 내보내기 기능
							try {
								// 통계 데이터를 CSV 형식으로 변환
								const csvData = []
								
								// 헤더
								csvData.push(['시급이요 통계 리포트', `${selectedPeriod === '3months' ? '최근 3개월' : selectedPeriod === '6months' ? '최근 6개월' : '최근 1년'}`])
								csvData.push(['생성일', dayjs().format('YYYY-MM-DD HH:mm')])
								csvData.push([]) // 빈 줄
								
								// 전체 요약
								csvData.push(['=== 전체 요약 ==='])
								csvData.push(['총 수입', `${overallStats.totalIncome.toLocaleString()}원`])
								csvData.push(['총 근무시간', `${overallStats.totalHours.toFixed(1)}시간`])
								csvData.push(['근무일수', `${overallStats.uniqueWorkDays}일`])
								csvData.push(['평균 시급', `${Math.floor(overallStats.avgHourlyRate).toLocaleString()}원`])
								csvData.push([]) // 빈 줄
								
								// 월별 트렌드
								csvData.push(['=== 월별 트렌드 ==='])
								csvData.push(['월', '수입(원)', '근무시간(h)', '근무일수'])
								monthlyTrends.forEach(month => {
									csvData.push([
										dayjs(month.month).format('YYYY년 M월'),
										month.income.toLocaleString(),
										month.hours.toFixed(1),
										month.workDays
									])
								})
								csvData.push([]) // 빈 줄
								
								// 직업별 성과
								csvData.push(['=== 직업별 성과 ==='])
								csvData.push(['직업명', '총수입(원)', '근무시간(h)', '근무일수', '평균시급(원)'])
								jobAnalytics.forEach(job => {
									csvData.push([
										job.jobName,
										job.totalIncome.toLocaleString(),
										job.totalHours.toFixed(1),
										job.workDays,
										job.avgHourlyRate.toLocaleString()
									])
								})
								csvData.push([]) // 빈 줄
								
								// 요일별 패턴
								csvData.push(['=== 요일별 패턴 ==='])
								csvData.push(['요일', '총수입(원)', '근무일수', '평균수입(원)'])
								weekdayAnalysis.forEach(day => {
									if (day.count > 0) {
										csvData.push([
											day.dayName + '요일',
											day.income.toLocaleString(),
											day.count,
											Math.round(day.avgIncome).toLocaleString()
										])
									}
								})
								
								// CSV 문자열 생성
								const csvContent = csvData.map(row => 
									row.map(cell => `"${cell}"`).join(',')
								).join('\n')
								
								// 파일 다운로드
								const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
								const link = document.createElement('a')
								const url = URL.createObjectURL(blob)
								link.setAttribute('href', url)
								link.setAttribute('download', `시급이요_통계리포트_${dayjs().format('YYYY-MM-DD')}.csv`)
								link.style.visibility = 'hidden'
								document.body.appendChild(link)
								link.click()
								document.body.removeChild(link)
								
								showToast('통계 리포트가 다운로드되었습니다!', 'success')
							} catch (error) {
								console.error('CSV 내보내기 오류:', error)
								showToast('리포트 내보내기에 실패했습니다', 'error')
							}
						}}
						className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark transition-colors text-sm sm:text-base break-keep"
					>
						리포트 내보내기
					</button>
				</div>
			</div>
		</div>
	)
}

export default AnalyticsModal
