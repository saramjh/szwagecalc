import React, { createContext, useState, useContext, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal'; // ConfirmModal 컴포넌트 경로

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState(null); // { message: '', onConfirm: () => {}, onCancel: () => {} }

  const showConfirm = useCallback((message, onConfirmCallback, onCancelCallback) => {
    setConfirmState({
      message,
      onConfirm: () => {
        onConfirmCallback();
        setConfirmState(null);
      },
      onCancel: () => {
        if (onCancelCallback) onCancelCallback();
        setConfirmState(null);
      },
    });
  }, []);

  return (
    <ConfirmContext.Provider value={showConfirm}>
      {children}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={confirmState.onCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
