import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const HourlyRateSettingModal = ({ isOpen, onClose, onSaveHourlyRate, currentHourlyRate }) => {
  const [hourlyRate, setHourlyRate] = useState(currentHourlyRate);

  useEffect(() => {
    setHourlyRate(currentHourlyRate);
  }, [currentHourlyRate]);

  const handleSave = async () => {
    // Supabase에 시급 저장 (예: settings 테이블)
    // 여기서는 간단히 onSaveHourlyRate 콜백으로 전달
    onSaveHourlyRate(hourlyRate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ease-out">
      <div className="bg-cream-white dark:bg-charcoal-gray rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-dark-navy dark:text-white">시급 설정</h2>
          <button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-medium-gray dark:text-light-gray">
              시급 (원)
            </label>
            <input
              type="number"
              id="hourlyRate"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
              placeholder="예: 10000"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-medium-gray text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default HourlyRateSettingModal;
