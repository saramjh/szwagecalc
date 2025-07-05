import React, { useState, useEffect } from "react"

const UsageGuideModal = ({ isOpen, onClose, manualContent }) => {
	const [showModal, setShowModal] = useState(false) // 모달의 실제 렌더링 여부
	const [animateModal, setAnimateModal] = useState(false) // 애니메이션 클래스 적용 여부

	const [platform, setPlatform] = useState('other'); // 'ios', 'android', 'other'
	const [deferredPrompt, setDeferredPrompt] = useState(null); // Android PWA 설치 프롬프트

	useEffect(() => {
		const userAgent = navigator.userAgent;
		if (/(iPhone|iPad|iPod)/i.test(userAgent)) {
			setPlatform('ios');
		} else if (/Android/i.test(userAgent)) {
			setPlatform('android');
		}

		// Android Chrome PWA 설치 프롬프트 감지
		const handleBeforeInstallPrompt = (e) => {
			e.preventDefault();
			setDeferredPrompt(e);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	}, []);

	useEffect(() => {
		if (isOpen) {
			setShowModal(true) // 모달을 DOM에 렌더링 시작
			setTimeout(() => setAnimateModal(true), 10) // 약간의 지연 후 애니메이션 시작
			document.body.classList.add('modal-open'); // 모달이 열릴 때 body 스크롤 잠금
		} else {
			setAnimateModal(false) // 애니메이션 역재생 시작
			setTimeout(() => setShowModal(false), 300) // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
			document.body.classList.remove('modal-open'); // 모달이 닫힐 때 body 스크롤 잠금 해제
		}
	}, [isOpen])

	// 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
	useEffect(() => {
		return () => {
			document.body.classList.remove('modal-open');
		};
	}, []);

	if (!showModal) return null

	const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        setDeferredPrompt(null); // 프롬프트 사용 후 초기화
      });
    }
  };

	return (
		<div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${animateModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
			<div className={`bg-cream-white dark:bg-charcoal-gray rounded-lg shadow-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out ${animateModal ? "translate-y-0" : "translate-y-10"}`}>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-dark-navy dark:text-white">사용 가이드</h2>
					<button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
						&times;
					</button>
				</div>
				<div className="space-y-3 text-dark-navy dark:text-white">
					{manualContent.split("\n").map((line, index) => {
						if (line.trim() === "") {
							// 빈 줄 처리
							return <br key={index} />
						}
						if (line.match(/^\d+\./)) {
							// 숫자로 시작하는 줄 (제목)
							return (
								<p key={index} className="text-base font-semibold text-mint-green mt-2 first:mt-0">
									{line}
								</p>
							)
						}
						return (
							// 일반 내용
							<p key={index} className="text-sm leading-normal ml-4">
								{line}
							</p>
						)
					})}

					{/* 홈 화면 추가 섹션 */}
					<h3 className="text-lg font-semibold text-mint-green mt-6">앱처럼 사용하기: 홈 화면에 추가</h3>
					{platform === 'ios' && (
						<div className="space-y-2">
							<p className="text-sm leading-normal ml-4">1. Safari 하단/상단의 <span className="font-bold">[공유]</span> 아이콘 <span className="inline-block align-middle"><img src="/logo192.png" alt="iOS Share Icon" className="h-4 w-4" /></span>을 탭하세요.</p>
							<p className="text-sm leading-normal ml-4">2. 메뉴에서 <span className="font-bold">[홈 화면에 추가]</span>를 선택하세요.</p>
							<p className="text-sm leading-normal ml-4">3. <span className="font-bold">[추가]</span> 버튼을 탭하면 완료됩니다.</p>
						</div>
					)}
					{platform === 'android' && (
						<div className="space-y-2">
							{deferredPrompt ? (
								<>
									<p className="text-sm leading-normal ml-4">아래 버튼을 눌러 홈 화면에 추가하세요.</p>
									<button onClick={handleInstallClick} className="px-4 py-2 bg-mint-green text-white rounded-lg">
										홈 화면에 추가
									</button>
								</>
							) : (
								<>
									<p className="text-sm leading-normal ml-4">1. Chrome 브라우저 우측 상단의 <span className="font-bold">[더보기]</span> 아이콘 <span className="inline-block align-middle"><img src="/logo192.png" alt="Android Menu Icon" className="h-4 w-4" /></span>(점 세 개)을 탭하세요.</p>
									<p className="text-sm leading-normal ml-4">2. 메뉴에서 <span className="font-bold">[홈 화면에 추가]</span>를 선택하세요.</p>
									<p className="text-sm leading-normal ml-4">3. <span className="font-bold">[추가]</span> 버튼을 탭하면 완료됩니다.</p>
								</>
							)}
						</div>
					)}
					{platform === 'other' && (
						<p className="text-sm leading-normal ml-4">현재 브라우저에서는 이 기능을 지원하지 않거나, 수동으로 추가해야 합니다. 브라우저 설정을 확인해주세요.</p>
					)}
				</div>
				<div className="mt-6 text-center">
					<button onClick={onClose} className="px-6 py-3 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 text-lg font-semibold transition-all duration-200 ease-in-out transform hover:scale-105">
						닫기
					</button>
				</div>
			</div>
		</div>
	)
}

export default UsageGuideModal
