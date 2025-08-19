import React, { useState, useEffect } from "react"
import { ChevronRightIcon, CheckCircleIcon, PlayIcon, BookOpenIcon, SparklesIcon } from "lucide-react"

const InteractiveGuide = ({ isOpen, onClose, currentStep = 0, userProgress = {}, onStartTour }) => {
	const [showModal, setShowModal] = useState(false)
	const [animateModal, setAnimateModal] = useState(false)
	const [activeTab, setActiveTab] = useState('quickstart') // 'quickstart', 'features', 'tips'
	const [expandedItem, setExpandedItem] = useState(null)

	useEffect(() => {
		if (isOpen) {
			setShowModal(true)
			setTimeout(() => setAnimateModal(true), 10)
			document.body.classList.add('modal-open')
		} else {
			setAnimateModal(false)
			setTimeout(() => setShowModal(false), 300)
			document.body.classList.remove('modal-open')
		}
	}, [isOpen])

	if (!showModal) return null

	// 🚀 진행 상황 기반 개인화 가이드
	const quickStartSteps = [
		{
			id: 'setup-job',
			title: '직업 설정하기',
			description: '나만의 일자리를 추가해보세요',
			completed: userProgress.hasJobs,
			action: '직업 추가',
			icon: '💼',
			time: '1분',
			benefit: '시급과 휴게시간 정책을 직업별로 관리할 수 있어요'
		},
		{
			id: 'set-hourly-rate',
			title: '시급 설정하기',
			description: '정확한 급여 계산을 위한 시급 입력',
			completed: userProgress.hasHourlyRate,
			action: '시급 설정',
			icon: '💰',
			time: '30초',
			benefit: '언제든 시급이 바뀌면 기록을 남길 수 있어요'
		},
		{
			id: 'first-record',
			title: '첫 근무 기록하기',
			description: '오늘의 근무를 기록해보세요',
			completed: userProgress.hasRecords,
			action: '기록 추가',
			icon: '⏰',
			time: '30초',
			benefit: '휴게시간도 자동으로 계산돼요'
		},
		{
			id: 'check-report',
			title: '월급 확인하기',
			description: '이번 달 얼마나 벌었는지 확인해보세요',
			completed: userProgress.checkedReport,
			action: '월급 보기',
			icon: '📊',
			time: '10초',
			benefit: '주휴수당까지 정확하게 계산해드려요'
		}
	]

	const features = [
		{
			id: 'break-time',
			title: '휴게시간 자동 계산',
			description: '근로기준법에 따른 휴게시간을 자동으로 계산하고 급여에 반영해요',
			icon: '☕',
			tips: ['4시간 이상 근무 시 30분 휴게', '8시간 이상 근무 시 1시간 휴게', '직업별로 유급/무급 설정 가능']
		},
		{
			id: 'weekly-allowance',
			title: '주휴수당 계산',
			description: '주 15시간 이상 근무하면 주휴수당을 자동으로 계산해드려요',
			icon: '🎯',
			tips: ['주 15시간 이상 근무 시 지급', '무단결근 시 주휴수당 차감', '직업별 개별 계산']
		},
		{
			id: 'smart-insights',
			title: '똑똑한 급여 분석',
			description: '휴게시간 차액, 최적 근무시간 등을 분석해서 알려드려요',
			icon: '🧠',
			tips: ['휴게시간으로 인한 급여 차액 표시', '최대 가능 급여 vs 실제 급여', '월별 트렌드 분석']
		}
	]

	const tips = [
		{
			title: '💡 빠른 기록 팁',
			content: '달력에서 날짜를 길게 누르면 빠른 기록 모달이 열려요'
		},
		{
			title: '🔄 데이터 백업',
			content: 'CSV 내보내기로 언제든 데이터를 백업하고 다른 앱에서 활용하세요'
		},
		{
			title: '📱 앱처럼 사용',
			content: '홈 화면에 추가하면 네이티브 앱처럼 빠르게 접근할 수 있어요'
		},
		{
			title: '🌙 다크모드',
			content: '시스템 설정에 따라 자동으로 다크모드가 적용돼요'
		},
		{
			title: '🎯 가이드 투어',
			content: '언제든 이 가이드에서 "투어 다시 체험하기" 버튼으로 기능 설명을 다시 볼 수 있어요'
		}
	]

	const completedSteps = quickStartSteps.filter(step => step.completed).length
	const progressPercentage = (completedSteps / quickStartSteps.length) * 100

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} z-layer-modal p-4`}>
			<div className={`bg-cream-white dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/50 w-full max-w-lg min-h-[80vh] max-h-[95vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0 scale-100" : "translate-y-10 scale-95"}`}>
				
				{/* 🎨 헤더 - Etos 스타일 그라데이션 */}
				<div className="bg-gradient-to-r from-mint-green to-emerald-500 dark:from-mint-green-dark dark:to-emerald-600 py-4 sm:py-6 text-white relative overflow-hidden flex-shrink-0">
					<div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-mint-green opacity-10 dark:opacity-20 rounded-full -mr-16 -mt-16"></div>
					<div className="relative z-10">
						<div className="flex justify-between items-start mb-3 sm:mb-4 px-6">
							<div>
								<h2 className="text-xl sm:text-2xl font-bold">시급이요 가이드</h2>
								<p className="text-mint-100 text-xs sm:text-sm mt-1">당신의 급여 관리 파트너</p>
							</div>
							<button 
								onClick={onClose} 
								className="text-white hover:text-mint-100 text-xl sm:text-2xl transition-all duration-200 transform hover:scale-105 w-8 h-8 flex items-center justify-center"
							>
								×
							</button>
						</div>
						
						{/* 진행 상황 표시 */}
						{activeTab === 'quickstart' && (
							<div className="mt-2 sm:mt-4 mx-6">
								<div className="bg-dark-navy dark:bg-gray-800 bg-opacity-20 dark:bg-opacity-90 rounded-xl p-3 sm:p-4 backdrop-blur-sm border border-white dark:border-gray-600 border-opacity-20 dark:border-opacity-40">
									<div className="flex items-center justify-between mb-2">
										<span className="text-xs sm:text-sm font-medium text-white drop-shadow-md">설정 진행률</span>
										<span className="text-xs sm:text-sm text-white drop-shadow-md">{completedSteps}/{quickStartSteps.length}</span>
									</div>
									<div className="w-full bg-dark-navy dark:bg-gray-600 bg-opacity-30 dark:bg-opacity-50 rounded-full h-2">
										<div 
											className="bg-white dark:bg-mint-green h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
											style={{ width: `${progressPercentage}%` }}
										></div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* 🎯 탭 네비게이션 - Etos 카드 스타일 */}
				<div className="px-6 pt-3 pb-4 sm:pt-4 sm:pb-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0 bg-gradient-to-b from-mint-green/5 dark:from-mint-green/10 to-transparent">
					<div className="flex space-x-1 sm:space-x-2">
						{[
							{ id: 'quickstart', label: '빠른 시작', icon: SparklesIcon },
							{ id: 'features', label: '주요 기능', icon: BookOpenIcon },
							{ id: 'tips', label: '유용한 팁', icon: '💡' }
						].map(tab => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
									activeTab === tab.id 
										? 'bg-mint-green text-white shadow-lg' 
										: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
								}`}
							>
								{typeof tab.icon === 'string' ? (
									<span className="text-sm sm:text-base">{tab.icon}</span>
								) : (
									<tab.icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
								)}
								<span className="whitespace-nowrap">{tab.label}</span>
							</button>
						))}
					</div>
				</div>

				{/* 📱 컨텐츠 영역 - 스크롤 가능 */}
				<div className="flex-1 overflow-y-auto">
					
					{/* 빠른 시작 탭 */}
					{activeTab === 'quickstart' && (
						<div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
							{progressPercentage === 100 && (
								<div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 rounded-xl p-4 mb-6">
									<div className="flex items-center space-x-3">
										<CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
										<div>
											<h3 className="font-semibold text-green-800 dark:text-green-200">완료했어요! 🎉</h3>
											<p className="text-sm text-green-600 dark:text-green-300">이제 시급이요의 모든 기능을 사용할 수 있어요</p>
										</div>
									</div>
								</div>
							)}
							
							{quickStartSteps.map((step, index) => (
								<div 
									key={step.id}
									className={`relative border rounded-xl p-4 transition-all duration-200 ${
										step.completed 
											? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/50' 
											: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:shadow-md dark:hover:bg-gray-750'
									}`}
								>
									<div className="flex items-start space-x-4">
										<div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
											step.completed 
												? 'bg-green-100 dark:bg-green-800/50' 
												: 'bg-mint-green bg-opacity-10 dark:bg-mint-green-dark dark:bg-opacity-20'
										}`}>
											{step.completed ? '✅' : step.icon}
										</div>
										
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between mb-2">
												<h3 className={`font-semibold break-keep ${step.completed ? 'text-green-800 dark:text-green-200' : 'text-dark-navy dark:text-white'}`}>
													{step.title}
												</h3>
												<span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{step.time}</span>
											</div>
											
											<p className="text-sm text-gray-600 dark:text-gray-300 mb-3 break-keep leading-relaxed">{step.description}</p>
											
											{step.benefit && (
												<div className="bg-mint-green bg-opacity-10 dark:bg-mint-green-dark dark:bg-opacity-20 rounded-lg p-3 mb-3">
													<p className="text-xs text-mint-800 dark:text-mint-200">💫 {step.benefit}</p>
												</div>
											)}
											
											{!step.completed && (
												<button
													onClick={() => onStartTour?.(step.id)}
													className="inline-flex items-center space-x-2 text-sm font-medium text-mint-green dark:text-mint-green hover:text-mint-700 dark:hover:text-mint-green-dark transition-colors duration-200"
												>
													<PlayIcon className="w-4 h-4" />
													<span className="break-keep">{step.action}</span>
													<ChevronRightIcon className="w-4 h-4" />
												</button>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* 주요 기능 탭 */}
					{activeTab === 'features' && (
						<div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
							{features.map(feature => (
								<div key={feature.id} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
									<button
										onClick={() => setExpandedItem(expandedItem === feature.id ? null : feature.id)}
										className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
									>
										<div className="flex items-center space-x-4">
											<div className="w-12 h-12 bg-mint-green bg-opacity-10 dark:bg-mint-green-dark dark:bg-opacity-20 rounded-xl flex items-center justify-center text-2xl">
												{feature.icon}
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="font-semibold text-dark-navy dark:text-white break-keep">{feature.title}</h3>
												<p className="text-sm text-gray-600 dark:text-gray-300 break-keep leading-relaxed">{feature.description}</p>
											</div>
											<ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${expandedItem === feature.id ? 'rotate-90' : ''}`} />
										</div>
									</button>
									
									{expandedItem === feature.id && (
										<div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/50">
											<div className="bg-white dark:bg-gray-700/50 rounded-lg p-3">
												<h4 className="font-medium text-sm text-gray-800 dark:text-gray-200 mb-2">알아두면 좋은 점:</h4>
												<ul className="space-y-1">
													{feature.tips.map((tip, index) => (
														<li key={index} className="text-xs text-gray-600 dark:text-gray-300 flex items-start space-x-2">
															<span className="text-mint-green dark:text-mint-green mt-1 flex-shrink-0">•</span>
															<span className="break-keep leading-relaxed">{tip}</span>
														</li>
													))}
												</ul>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					)}

					{/* 유용한 팁 탭 */}
					{activeTab === 'tips' && (
						<div className="p-4 sm:p-6 space-y-3">
							{tips.map((tip, index) => (
								<div key={index} className="bg-gradient-to-r from-mint-green to-emerald-500 bg-opacity-5 dark:bg-opacity-10 border border-mint-green dark:border-mint-green-dark border-opacity-20 dark:border-opacity-30 rounded-xl p-4">
									<h3 className="font-semibold text-dark-navy dark:text-white mb-2 break-keep">{tip.title}</h3>
									<p className="text-sm text-gray-600 dark:text-gray-300 break-keep leading-relaxed">{tip.content}</p>
									{tip.title.includes('가이드 투어') && (
										<div className="mt-3">
											<button
												onClick={() => onStartTour?.()}
												className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-1"
											>
												<SparklesIcon className="w-4 h-4" />
												<span>투어 시작하기</span>
											</button>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{/* 🚀 액션 버튼 - 고정 위치 */}
				{activeTab === 'quickstart' && (
					<div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
						{progressPercentage < 100 ? (
							<button
								onClick={() => onStartTour?.()}
								className="w-full bg-gradient-to-r from-mint-green to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
							>
								<SparklesIcon className="w-5 h-5" />
								<span>가이드 투어 시작하기</span>
							</button>
						) : (
							<div className="space-y-3">
								<div className="text-center py-2">
									<p className="text-sm text-gray-600 dark:text-gray-300">🎉 모든 설정이 완료되었습니다!</p>
								</div>
								<button
									onClick={() => onStartTour?.()}
									className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
								>
									<SparklesIcon className="w-5 h-5" />
									<span>투어 다시 체험하기</span>
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export default InteractiveGuide
