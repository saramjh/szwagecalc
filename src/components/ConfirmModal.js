import React, { useState, useEffect } from 'react';

const ConfirmModal = ({ message, onConfirm, onCancel }) => {
  const [showModal, setShowModal] = useState(false); // 모달의 실제 렌더링 여부
  const [animateModal, setAnimateModal] = useState(false); // 애니메이션 클래스 적용 여부

  useEffect(() => {
    if (message) { // message가 있을 때 모달을 띄움
      setShowModal(true); // 모달을 DOM에 렌더링 시작
      setTimeout(() => setAnimateModal(true), 10); // 약간의 지연 후 애니메이션 시작
      document.body.classList.add('modal-open'); // 모달이 열릴 때 body 스크롤 잠금
    } else {
      setAnimateModal(false); // 애니메이션 역재생 시작
      setTimeout(() => setShowModal(false), 300); // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
      document.body.classList.remove('modal-open'); // 모달이 닫힐 때 body 스크롤 잠금 해제
    }
  }, [message]);

  // 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  if (!showModal) return null;

  return (
    		<div className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center transition-opacity duration-300 ease-out ${animateModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} z-layer-modal`}>
      <div className={`bg-cream-white dark:bg-gray-900 rounded-lg shadow-lg dark:shadow-2xl dark:shadow-black/50 p-6 w-full max-w-xs mx-4 text-center transform transition-all duration-300 ease-out ${animateModal ? 'translate-y-0' : 'translate-y-10'}`}>
        <p className="text-dark-navy dark:text-white text-lg mb-6">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-medium-gray text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            아니요
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            네
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
