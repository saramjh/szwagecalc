import React, { createContext, useState, useContext, useCallback } from 'react';
import ToastNotification from '../components/ToastNotification'; // ToastNotification 컴포넌트 경로

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' | 'info' }

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000); // 3초 후 자동으로 사라짐
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <ToastNotification message={toast.message} type={toast.type} />}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
