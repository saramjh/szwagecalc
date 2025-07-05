import React from 'react';

const ToastNotification = ({ message, type }) => {
  let bgColorClass = '';
  switch (type) {
    case 'success':
      bgColorClass = 'bg-mint-green';
      break;
    case 'error':
      bgColorClass = 'bg-coral-pink';
      break;
    case 'info':
    default:
      bgColorClass = 'bg-medium-gray';
      break;
  }

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white text-center z-50 transition-all duration-300 ease-out ${bgColorClass}`}>
      {message}
    </div>
  );
};

export default ToastNotification;
