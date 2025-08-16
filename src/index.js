import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker 등록 및 자동 업데이트 처리
serviceWorkerRegistration.register({
  onUpdate: registration => {
    // 새 버전이 사용 가능할 때 자동 업데이트
    const waitingServiceWorker = registration.waiting;

    if (waitingServiceWorker) {
      // 즉시 새 Service Worker 활성화 (자동 업데이트)
      waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // 페이지 새로고침으로 새 버전 적용
      waitingServiceWorker.addEventListener('statechange', e => {
        if (e.target.state === 'activated') {
          // 토스 스타일 업데이트 알림
          const updateToast = document.createElement('div');
          updateToast.innerHTML = `
            <div style="
              position: fixed; 
              top: 20px; 
              left: 50%; 
              transform: translateX(-50%); 
              background: linear-gradient(135deg, #10B981, #059669); 
              color: white; 
              padding: 16px 24px; 
              border-radius: 16px; 
              box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
              z-index: 10000;
              font-family: 'Pretendard Variable', sans-serif;
              font-weight: 600;
              animation: slideInDown 0.5s ease-out;
            ">
              🚀 새 버전으로 업데이트되었습니다!
            </div>
            <style>
              @keyframes slideInDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
              }
            </style>
          `;
          document.body.appendChild(updateToast);
          
          // 2초 후 새로고침
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      });
    }
  },
  onSuccess: registration => {
    console.log('PWA Service Worker registered successfully:', registration);
  }
});
