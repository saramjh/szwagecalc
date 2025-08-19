import React, { useState, useEffect, useCallback, useMemo } from "react"
import { DollarSign, Target, BarChart3, XIcon, LightbulbIcon, ArrowUpIcon } from "lucide-react"

// 🎯 상황별 도움말 컴포넌트 - Etos 스타일
const ContextualHelp = ({ context, userProgress = {}, onAction }) => {
	const [isVisible, setIsVisible] = useState(false)
	const [isDismissed, setIsDismissed] = useState(false)
	const [shouldShow, setShouldShow] = useState(false)

	// 상황별 도움말 정의 (useMemo로 최적화)
	const helpContent = useMemo(() => ({
		'empty-calendar': {
			title: '첫 근무를 기록해보세요!',
			message: '달력에서 근무한 날짜를 선택하면 쉽게 기록할 수 있어요',
			action: { text: '오늘 기록하기', type: 'add-today' },
			condition: () => !userProgress.hasRecords,
			priority: 'high'
		},
		'no-jobs': {
			title: '직업을 먼저 설정해주세요',
			message: '정확한 급여 계산을 위해 직업 정보가 필요해요',
			action: { text: '직업 추가하기', type: 'open-job-management' },
			condition: () => !userProgress.hasJobs,
			priority: 'critical'
		},
		'no-hourly-rate': {
			title: '시급을 설정해주세요',
			message: '시급을 설정하면 자동으로 급여를 계산해드려요',
			icon: DollarSign,
			action: { text: '시급 설정하기', type: 'open-hourly-rate' },
			condition: () => userProgress.hasJobs && !userProgress.hasHourlyRate,
			priority: 'high'
		},
		'break-time-benefit': {
			title: '휴게시간 차액을 확인해보세요 ☕',
			message: '휴게시간으로 인한 급여 차이를 분석해드려요',
			action: { text: '상세 보기', type: 'show-break-analysis' },
			condition: () => userProgress.hasRecords && userProgress.hasBreakTimeDifference,
			priority: 'medium'
		},
		'weekly-allowance-eligible': {
			title: '주휴수당 대상이에요!',
			message: '이번 주 15시간 이상 근무해서 주휴수당을 받을 수 있어요',
			icon: Target,
			action: { text: '주휴수당 보기', type: 'show-weekly-allowance' },
			condition: () => userProgress.weeklyHours >= 15,
			priority: 'medium'
		},
		'monthly-summary': {
			title: '이번 달 정산을 확인해보세요',
			message: '월말이 다가왔어요. 이번 달 급여를 정리해보세요',
			icon: BarChart3,
			action: { text: '월급 확인', type: 'open-monthly-report' },
			condition: () => userProgress.hasRecords && new Date().getDate() > 25,
			priority: 'low'
		}
	}), [userProgress])

	// 현재 상황에 맞는 도움말 찾기
	const getCurrentHelp = useCallback(() => {
		const contextHelp = helpContent[context]
		if (!contextHelp || !contextHelp.condition()) return null
		return contextHelp
	}, [context, helpContent])

	useEffect(() => {
		const help = getCurrentHelp()
		setShouldShow(!!help && !isDismissed)
		
		if (help && !isDismissed) {
			// 약간의 지연 후 표시 (자연스러운 애니메이션)
			setTimeout(() => setIsVisible(true), 500)
		}
	}, [context, userProgress, isDismissed, getCurrentHelp])

	const currentHelp = getCurrentHelp()

	if (!shouldShow || !currentHelp) return null

	const handleDismiss = () => {
		setIsVisible(false)
		setTimeout(() => {
			setIsDismissed(true)
			setShouldShow(false)
		}, 200)
	}

	const handleAction = () => {
		onAction?.(currentHelp.action.type)
		handleDismiss()
	}

	// 우선순위별 스타일링
	const getStylesByPriority = (priority) => {
		switch (priority) {
			case 'critical':
				return {
					bg: 'bg-gradient-to-r from-red-500 to-pink-500',
					border: 'border-red-200',
					text: 'text-white',
					action: 'bg-white text-red-600 hover:bg-red-50'
				}
			case 'high':
				return {
					bg: 'bg-gradient-to-r from-mint-green to-emerald-500',
					border: 'border-mint-200',
					text: 'text-white',
					action: 'bg-white text-mint-600 hover:bg-mint-50'
				}
			case 'medium':
				return {
					bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
					border: 'border-blue-200',
					text: 'text-white',
					action: 'bg-white text-blue-600 hover:bg-blue-50'
				}
			case 'low':
				return {
					bg: 'bg-gradient-to-r from-gray-600 to-gray-700',
					border: 'border-gray-200',
					text: 'text-white',
					action: 'bg-white text-gray-600 hover:bg-gray-50'
				}
			default:
				return {
					bg: 'bg-gradient-to-r from-mint-green to-emerald-500',
					border: 'border-mint-200',
					text: 'text-white',
					action: 'bg-white text-mint-600 hover:bg-mint-50'
				}
		}
	}

	const styles = getStylesByPriority(currentHelp.priority)

	return (
		<div className={`fixed bottom-4 left-4 right-4 z-50 transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} max-w-sm mx-auto`}>
			<div className={`${styles.bg} rounded-2xl shadow-xl p-4 ${styles.border} border backdrop-blur-sm`}>
				<div className="flex items-start space-x-3">
					<div className="flex-shrink-0">
						{currentHelp.icon ? (
							<currentHelp.icon className={`w-6 h-6 ${styles.text}`} />
						) : (
							<LightbulbIcon className={`w-6 h-6 ${styles.text}`} />
						)}
					</div>
					
					<div className="flex-1 min-w-0">
						<h3 className={`font-semibold text-sm ${styles.text} mb-1`}>
							{currentHelp.title}
						</h3>
						<p className={`text-xs ${styles.text} opacity-90 mb-3 leading-relaxed`}>
							{currentHelp.message}
						</p>
						
						<div className="flex items-center space-x-2">
							<button
								onClick={handleAction}
								className={`px-3 py-1.5 rounded-lg text-xs font-medium ${styles.action} transition-all duration-200 transform hover:scale-105 flex items-center space-x-1`}
							>
								<span>{currentHelp.action.text}</span>
								<ArrowUpIcon className="w-3 h-3 rotate-45" />
							</button>
							
							<button
								onClick={handleDismiss}
								className={`p-1.5 rounded-lg ${styles.text} hover:bg-white hover:bg-opacity-20 transition-all duration-200`}
							>
								<XIcon className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>

				{/* Etos 스타일 장식 요소 */}
				<div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8"></div>
				<div className="absolute bottom-0 left-0 w-8 h-8 bg-white opacity-5 rounded-full -ml-4 -mb-4"></div>
			</div>
		</div>
	)
}



export default ContextualHelp
