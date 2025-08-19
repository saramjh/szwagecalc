// 📱 모달 계층 관리 유틸리티
import { useCallback } from 'react'

class ModalManager {
	constructor() {
		this.openModals = 0 // 현재 열린 모달 개수
	}

	// 모달이 열릴 때 호출
	openModal() {
		this.openModals++
		if (this.openModals === 1) {
			// 첫 번째 모달이 열릴 때만 헤더 숨김
			document.body.classList.add('modal-open')
			console.log(`🔵 모달 시스템 활성화: ${this.openModals}개`)
		}
	}

	// 모달이 닫힐 때 호출
	closeModal() {
		if (this.openModals <= 0) {
			// 이미 0개면 더 이상 처리하지 않음 (메모리 누수 방지)
			return
		}
		
		this.openModals--
		if (this.openModals === 0) {
			// 모든 모달이 닫혔을 때만 헤더 복원
			document.body.classList.remove('modal-open')
			console.log(`🔴 모달 시스템 비활성화: ${this.openModals}개`)
		}
	}

	// 긴급 상황시 모든 모달 강제 리셋
	resetAllModals() {
		this.openModals = 0
		document.body.classList.remove('modal-open')
		console.log('🔄 모든 모달 강제 리셋')
	}

	// 현재 상태 확인
	getActiveModals() {
		return this.openModals
	}
}

// 전역 인스턴스 생성
export const modalManager = new ModalManager()

// React 훅으로 사용하기 쉽게 래핑

export const useModalManager = () => {
	const openModal = useCallback(() => modalManager.openModal(), [])
	const closeModal = useCallback(() => modalManager.closeModal(), [])
	const resetAllModals = useCallback(() => modalManager.resetAllModals(), [])
	const getActiveModals = useCallback(() => modalManager.getActiveModals(), [])

	return {
		openModal,
		closeModal,
		resetAllModals,
		getActiveModals
	}
}
