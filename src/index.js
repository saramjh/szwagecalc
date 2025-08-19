import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// PWA Service Worker 등록 및 자동 업데이트 처리 (개발 모드에서는 비활성화)
if (process.env.NODE_ENV === 'production') {
serviceWorkerRegistration.register({
  onUpdate: registration => {
    // 새 버전이 사용 가능할 때 사용자에게 알림
    const waitingServiceWorker = registration.waiting;

    if (waitingServiceWorker) {
      // 🎯 토스 스타일 업데이트 확인 대화상자
      const showUpdatePrompt = () => {
        const updatePrompt = document.createElement('div');
        updatePrompt.innerHTML = `
          <div id="update-prompt" style="
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0, 0, 0, 0.5); 
            z-index: 10000; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            animation: fadeIn 0.3s ease-out;
          ">
            <div style="
              background: white; 
              border-radius: 20px; 
              padding: 24px; 
              max-width: 320px; 
              margin: 20px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
              font-family: 'Pretendard Variable', sans-serif;
              text-align: center;
            ">
              <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
              <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1F2937;">
                새 업데이트가 있습니다!
              </h3>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                시급이요의 새로운 기능과 개선사항을<br>지금 바로 사용해보세요.
              </p>
              <div style="display: flex; gap: 8px;">
                <button id="update-later" style="
                  flex: 1; 
                  padding: 12px; 
                  border: 1px solid #E5E7EB; 
                  border-radius: 12px; 
                  background: white; 
                  color: #6B7280; 
                  font-size: 14px; 
                  font-weight: 600; 
                  cursor: pointer;
                ">나중에</button>
                <button id="update-now" style="
                  flex: 1; 
                  padding: 12px; 
                  border: none; 
                  border-radius: 12px; 
                  background: linear-gradient(135deg, #10B981, #059669); 
                  color: white; 
                  font-size: 14px; 
                  font-weight: 600; 
                  cursor: pointer;
                ">지금 업데이트</button>
              </div>
            </div>
          </div>
          <style>
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          </style>
        `;
        document.body.appendChild(updatePrompt);

        // 버튼 이벤트 리스너
        document.getElementById('update-now').addEventListener('click', () => {
          document.body.removeChild(updatePrompt);
          applyUpdate();
        });

        document.getElementById('update-later').addEventListener('click', () => {
          document.body.removeChild(updatePrompt);
          // 10분 후 다시 알림
          setTimeout(showUpdatePrompt, 10 * 60 * 1000);
        });
      };

      // 업데이트 적용 함수
      const applyUpdate = () => {
        // 즉시 새 Service Worker 활성화
        waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
        
        // 업데이트 진행 알림
        const loadingToast = document.createElement('div');
        loadingToast.innerHTML = `
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
            z-index: 10001;
            font-family: 'Pretendard Variable', sans-serif;
            font-weight: 600;
            animation: slideInDown 0.5s ease-out;
          ">
            🔄 업데이트 중...
          </div>
          <style>
            @keyframes slideInDown {
              from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
              to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
          </style>
        `;
        document.body.appendChild(loadingToast);
        
        // 페이지 새로고침으로 새 버전 적용
        waitingServiceWorker.addEventListener('statechange', e => {
          if (e.target.state === 'activated') {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        });
      };

      // 즉시 업데이트 프롬프트 표시
      showUpdatePrompt();
    }
  },
  onSuccess: registration => {
    console.log('💾 시급이요 PWA가 성공적으로 설치되었습니다!', registration);
    
    // 정기적으로 업데이트 확인 (1시간마다)
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);
  }
});
}
