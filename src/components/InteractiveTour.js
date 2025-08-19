import React, { useState, useEffect, useCallback } from "react"
import { ChevronRightIcon, XIcon, CheckCircleIcon } from "lucide-react"

const InteractiveTour = ({ 
	isActive, 
	onComplete, 
	onSkip, 
	currentStep = 0,
	onStepChange,
	targetElements = {} 
}) => {
	const [activeStep, setActiveStep] = useState(currentStep)
	const [isVisible, setIsVisible] = useState(false)

	// 투어 단계 정의
	const tourSteps = [
		{
			id: "job_setup",
			title: "1단계: 직업 설정하기",
			description: "먼저 직업을 추가하고 설정해보세요",
			targetSelector: "[data-tour='job-management'], [data-tour='hamburger-menu']",
			position: "bottom",
			content: "햄버거 메뉴(☰)를 열고 '직업 관리'를 클릭해주세요",
			action: "직업 관리 메뉴 선택"
		},
		{
			id: "hourly_rate",
			title: "2단계: 시급 설정하기",
			description: "정확한 급여 계산을 위해 시급을 설정하세요",
			targetSelector: "[data-tour='hourly-rate']",
			position: "bottom",
			content: "시급을 설정하면 자동으로 급여가 계산돼요",
			action: "시급 설정 열기"
		},
		{
			id: "record_work",
			title: "3단계: 첫 근무 기록하기",
			description: "오늘의 근무시간을 기록해보세요",
			targetSelector: "[data-tour='calendar-date']",
			position: "bottom",
			content: "달력에서 날짜를 클릭해 근무시간을 기록하세요",
			action: "근무 기록 추가"
		},
		{
			id: "check_salary",
			title: "4단계: 월급 확인하기",
			description: "이달의 수입을 확인해보세요",
			targetSelector: "[data-tour='monthly-report']",
			position: "bottom",
			content: "월급 확인 버튼으로 상세한 급여 내역을 볼 수 있어요",
			action: "월급 확인하기"
		}
	]

	const currentTourStep = tourSteps[activeStep]

	useEffect(() => {
		if (isActive) {
			setIsVisible(true)
			setActiveStep(currentStep)
		} else {
			setIsVisible(false)
		}
	}, [isActive, currentStep])

	// 타겟 요소 하이라이트
	const highlightTarget = useCallback(() => {
		// 기존 하이라이트 제거
		document.querySelectorAll('.tour-highlight').forEach(el => {
			el.classList.remove('tour-highlight')
		})

		if (!currentTourStep) return

		// 여러 셀렉터가 있는 경우 첫 번째로 찾아지는 것 사용
		const selectors = currentTourStep.targetSelector.split(', ')
		let targetElement = null
		
		for (const selector of selectors) {
			targetElement = document.querySelector(selector.trim())
			if (targetElement) break
		}

		if (targetElement) {
			targetElement.classList.add('tour-highlight')
			// 요소로 스크롤
			targetElement.scrollIntoView({ 
				behavior: 'smooth', 
				block: 'center',
				inline: 'center'
			})
		}
	}, [currentTourStep])

	useEffect(() => {
		if (isVisible && currentTourStep) {
			// 약간의 딜레이 후 하이라이트
			const timer = setTimeout(highlightTarget, 300)
			return () => clearTimeout(timer)
		}
	}, [isVisible, currentTourStep, highlightTarget])

	// 다음 단계로
	const handleNext = () => {
		if (activeStep < tourSteps.length - 1) {
			const nextStep = activeStep + 1
			setActiveStep(nextStep)
			onStepChange?.(nextStep)
		} else {
			handleComplete()
		}
	}

	// 이전 단계로
	const handlePrevious = () => {
		if (activeStep > 0) {
			const prevStep = activeStep - 1
			setActiveStep(prevStep)
			onStepChange?.(prevStep)
		}
	}

	// 투어 완료
	const handleComplete = () => {
		// 하이라이트 제거
		document.querySelectorAll('.tour-highlight').forEach(el => {
			el.classList.remove('tour-highlight')
		})
		setIsVisible(false)
		onComplete?.()
	}

	// 투어 건너뛰기
	const handleSkip = () => {
		// 하이라이트 제거
		document.querySelectorAll('.tour-highlight').forEach(el => {
			el.classList.remove('tour-highlight')
		})
		setIsVisible(false)
		onSkip?.()
	}

	// 타겟 요소의 위치 계산 (뷰포트 경계 체크 포함)
	const getTooltipPosition = () => {
		if (!currentTourStep) return { top: '50%', left: '50%' }

		// 여러 셀렉터가 있는 경우 첫 번째로 찾아지는 것 사용
		const selectors = currentTourStep.targetSelector.split(', ')
		let targetElement = null
		
		for (const selector of selectors) {
			targetElement = document.querySelector(selector.trim())
			if (targetElement) break
		}

		if (!targetElement) return { top: '50%', left: '50%' }

		const rect = targetElement.getBoundingClientRect()
		const isMobile = window.innerWidth <= 640 // sm breakpoint
		const tooltipWidth = isMobile ? Math.min(340, window.innerWidth - 32) : 384 // 모바일에서 더 넓게
		const tooltipHeight = isMobile ? 240 : 200 // 모바일에서 적절한 높이
		const margin = isMobile ? 20 : 16 // 모바일에서 더 충분한 여백
		
		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight

		let position = currentTourStep.position
		let top, left, transform

		// 모바일에서는 더 단순한 중앙 배치 전략 사용
		if (isMobile) {
			// 모바일에서는 화면 중앙에 배치하되, 타겟 요소를 가려지지 않게 조정
			const centerY = viewportHeight / 2
			const targetCenterY = rect.top + rect.height / 2
			
			if (Math.abs(centerY - targetCenterY) < tooltipHeight / 2 + 50) {
				// 타겟과 중앙이 겹치면 타겟 위쪽 또는 아래쪽에 배치
				if (targetCenterY > centerY) {
					// 타겟이 화면 하단에 있으면 위쪽에 툴팁
					top = Math.max(margin, targetCenterY - tooltipHeight - 30)
				} else {
					// 타겟이 화면 상단에 있으면 아래쪽에 툴팁
					top = Math.min(viewportHeight - tooltipHeight - margin, targetCenterY + 30)
				}
			} else {
				// 중앙 배치
				top = Math.max(margin, (viewportHeight - tooltipHeight) / 2)
			}
			
			left = viewportWidth / 2
			transform = 'translate(-50%, 0)'
			position = 'center'
		} else {
			// 데스크톱에서는 기존 로직 사용
			switch (position) {
				case 'top':
					top = rect.top - 15
					left = rect.left + rect.width / 2
					transform = 'translate(-50%, -100%)'
					break
				case 'bottom':
					top = rect.bottom + 15
					left = rect.left + rect.width / 2
					transform = 'translate(-50%, 0)'
					break
				case 'left':
					top = rect.top + rect.height / 2
					left = rect.left - 15
					transform = 'translate(-100%, -50%)'
					break
				case 'right':
					top = rect.top + rect.height / 2
					left = rect.right + 15
					transform = 'translate(0, -50%)'
					break
				default:
					top = rect.bottom + 15
					left = rect.left + rect.width / 2
					transform = 'translate(-50%, 0)'
			}
		}

		// 2차: 뷰포트 경계 체크 및 조정 (데스크톱에서만)
		if (!isMobile) {
			// 가로 위치 조정
			if (position === 'top' || position === 'bottom') {
			// 중앙 정렬된 툴팁의 경우
			const tooltipLeft = left - tooltipWidth / 2
			const tooltipRight = left + tooltipWidth / 2

			if (tooltipLeft < margin) {
				// 왼쪽으로 넘침
				left = margin + tooltipWidth / 2
			} else if (tooltipRight > viewportWidth - margin) {
				// 오른쪽으로 넘침
				left = viewportWidth - margin - tooltipWidth / 2
			}
		} else if (position === 'left') {
			// 왼쪽 배치된 툴팁이 화면 밖으로 나가면 오른쪽으로
			if (left - tooltipWidth < margin) {
				left = rect.right + 10
				transform = 'translate(0, -50%)'
				position = 'right'
			}
		} else if (position === 'right') {
			// 오른쪽 배치된 툴팁이 화면 밖으로 나가면 왼쪽으로
			if (left + tooltipWidth > viewportWidth - margin) {
				left = rect.left - 10
				transform = 'translate(-100%, -50%)'
				position = 'left'
			}
		}

		// 세로 위치 조정
		if (position === 'top') {
			// 위쪽 배치된 툴팁이 화면 위로 나가면 아래로
			if (top - tooltipHeight < margin) {
				top = rect.bottom + 10
				transform = transform.includes('-50%') ? 'translate(-50%, 0)' : transform.replace('-100%', '0')
				position = 'bottom'
			}
		} else if (position === 'bottom') {
			// 아래쪽 배치된 툴팁이 화면 아래로 나가면 위로
			if (top + tooltipHeight > viewportHeight - margin) {
				top = rect.top - 15
				transform = transform.includes('-50%') ? 'translate(-50%, -100%)' : transform.replace('0', '-100%')
				position = 'top'
			}
		} else if (position === 'left' || position === 'right') {
			// 좌우 배치된 툴팁의 세로 위치 조정
			const tooltipTop = top - tooltipHeight / 2
			const tooltipBottom = top + tooltipHeight / 2

			if (tooltipTop < margin) {
				top = margin + tooltipHeight / 2
			} else if (tooltipBottom > viewportHeight - margin) {
				top = viewportHeight - margin - tooltipHeight / 2
			}
		}
		}

		return { top, left, transform, adjustedPosition: position }
	}

	if (!isVisible || !currentTourStep) return null

	const tooltipStyle = getTooltipPosition()

	return (
		<>
			{/* 오버레이 */}
			<div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]" onClick={handleSkip} />

			{/* 투어 툴팁 */}
			<div
				className="fixed z-[10000] px-4 sm:px-0"
				style={{
					top: tooltipStyle.top,
					left: tooltipStyle.left,
					transform: tooltipStyle.transform,
					width: window.innerWidth <= 640 ? `${Math.min(340, window.innerWidth - 32)}px` : '384px',
					maxWidth: window.innerWidth <= 640 ? `${Math.min(340, window.innerWidth - 32)}px` : '384px'
				}}
			>
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 relative">
					{/* 화살표 */}
					{tooltipStyle.adjustedPosition !== 'center' && (
						<div className={`absolute w-3 h-3 bg-white dark:bg-gray-800 border rotate-45 ${
							tooltipStyle.adjustedPosition === 'top' 
								? 'bottom-[-6px] left-1/2 transform -translate-x-1/2 border-b border-r border-gray-200 dark:border-gray-700'
								: tooltipStyle.adjustedPosition === 'bottom'
								? 'top-[-6px] left-1/2 transform -translate-x-1/2 border-t border-l border-gray-200 dark:border-gray-700'
								: tooltipStyle.adjustedPosition === 'left'
								? 'right-[-6px] top-1/2 transform -translate-y-1/2 border-t border-r border-gray-200 dark:border-gray-700'
								: 'left-[-6px] top-1/2 transform -translate-y-1/2 border-b border-l border-gray-200 dark:border-gray-700'
						}`} />
					)}

					{/* 닫기 버튼 */}
					<button
						onClick={handleSkip}
						className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
					>
						<XIcon className="w-4 h-4" />
					</button>

					{/* 단계 표시 */}
					<div className="flex items-center space-x-2 mb-3">
						<div className="w-8 h-8 bg-mint-green rounded-full flex items-center justify-center text-white text-sm font-bold">
							{activeStep + 1}
						</div>
						<span className="text-xs text-gray-500 dark:text-gray-400">
							{activeStep + 1} / {tourSteps.length}
						</span>
					</div>

					{/* 제목과 설명 */}
					<h3 className="font-semibold text-gray-900 dark:text-white mb-2 break-keep text-base sm:text-lg">
						{currentTourStep.title}
					</h3>
					<p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 break-keep leading-relaxed word-break-keep">
						{currentTourStep.content}
					</p>

					{/* 액션 버튼들 */}
					<div className="flex items-center justify-between">
						<button
							onClick={handlePrevious}
							disabled={activeStep === 0}
							className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							이전
						</button>

						<div className="flex items-center space-x-2">
							<button
								onClick={handleSkip}
								className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							>
								건너뛰기
							</button>
							<button
								onClick={handleNext}
								className="bg-mint-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center space-x-1"
							>
								<span className="break-keep">{activeStep === tourSteps.length - 1 ? '완료' : '다음'}</span>
								{activeStep < tourSteps.length - 1 && <ChevronRightIcon className="w-4 h-4" />}
								{activeStep === tourSteps.length - 1 && <CheckCircleIcon className="w-4 h-4" />}
							</button>
						</div>
					</div>

					{/* 진행률 표시 */}
					<div className="mt-4 flex space-x-1">
						{tourSteps.map((_, index) => (
							<div
								key={index}
								className={`h-1 flex-1 rounded-full transition-colors ${
									index <= activeStep ? 'bg-mint-green' : 'bg-gray-200 dark:bg-gray-600'
								}`}
							/>
						))}
					</div>
				</div>
			</div>
		</>
	)
}

export default InteractiveTour
