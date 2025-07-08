import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import moment from 'moment';

const HourlyRateSettingModal = ({ isOpen, onClose, onSaveHourlyRate, session, jobs }) => {
  const [hourlyRate, setHourlyRate] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState(moment().format('YYYY-MM-DD'));

  const [showModal, setShowModal] = useState(false); // 모달의 실제 렌더링 여부
  const [animateModal, setAnimateModal] = useState(false); // 애니메이션 클래스 적용 여부

  useEffect(() => {
    if (isOpen) {
      setShowModal(true); // 모달을 DOM에 렌더링 시작
      setTimeout(() => setAnimateModal(true), 10); // 약간의 지연 후 애니메이션 시작
      document.body.classList.add('modal-open'); // 모달이 열릴 때 body 스크롤 잠금
    } else {
      setAnimateModal(false); // 애니메이션 역재생 시작
      setTimeout(() => setShowModal(false), 300); // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
      document.body.classList.remove('modal-open'); // 모달이 닫힐 때 body 스크롤 잠금 해제
    }
  }, [isOpen]);

  // 컴포넌트 언마운트 시 클린업 (혹시 모를 경우 대비)
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    const fetchCurrentHourlyRate = async () => {
      if (!session || !selectedJobId) return;

      const { data, error } = await supabase
        .from('hourly_rate_history')
        .select('hourly_rate, effective_date')
        .eq('user_id', session.user.id)
        .eq('job_id', selectedJobId)
        .order('effective_date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching current hourly rate:', error);
        setHourlyRate(0);
        setEffectiveDate(moment().format('YYYY-MM-DD'));
      } else if (data && data.length > 0) {
        setHourlyRate(data[0].hourly_rate);
        setEffectiveDate(data[0].effective_date);
      } else {
        setHourlyRate(0);
        setEffectiveDate(moment().format('YYYY-MM-DD'));
      }
    };

    if (isOpen && session && selectedJobId) {
      fetchCurrentHourlyRate();
    }
  }, [isOpen, session, selectedJobId]);

  useEffect(() => {
    if (isOpen && jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
    if (!isOpen) {
      setSelectedJobId(null);
      setEffectiveDate(moment().format('YYYY-MM-DD'));
    }
  }, [isOpen, jobs, selectedJobId]);

  const handleSave = () => {
    if (!session || !selectedJobId) return;
    onSaveHourlyRate(selectedJobId, hourlyRate, effectiveDate);
    onClose();
  };

  if (!showModal) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${animateModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-cream-white dark:bg-charcoal-gray rounded-2xl shadow-lg p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-out ${animateModal ? 'translate-y-0' : 'translate-y-10'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-dark-navy dark:text-white">시급 설정</h2>
          <button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-medium-gray dark:text-light-gray">
              직업 선택
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {jobs.length === 0 ? (
                <p className="text-sm text-medium-gray dark:text-light-gray">직업을 추가해주세요</p>
              ) : (
                jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200`}
                    style={{
                        backgroundColor: selectedJobId === job.id ? job.color : (job.color ? job.color + '33' : '#e5e7eb'), // 선택된 경우 직업 색상, 아니면 직업 색상에 투명도 20% (33) 또는 기본 회색
                        color: selectedJobId === job.id ? 'white' : '#1a202c', // 선택된 경우 흰색, 아니면 어두운 색
                    }}>
                    {job.job_name}
                  </button>
                ))
              )}
            </div>
          </div>
          <div>
            <label htmlFor="effectiveDate" className="block text-sm font-medium text-light-gray-500 dark:text-dark-text">
                적용 시작일
              </label>
            <input
              type="date"
              id="effectiveDate"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-light-gray-300 rounded-md shadow-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-light-bg dark:bg-dark-gray-200 text-light-text dark:text-dark-text"
            />
          </div>
          <div>
            <label htmlFor="hourlyRate" className="block text-sm font-medium text-light-gray-500 dark:text-dark-text">
              시급 (원)
            </label>
            <input
              type="number"
              id="hourlyRate"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-light-gray-300 rounded-md shadow-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-light-bg dark:bg-dark-gray-200 text-light-text dark:text-dark-text"
              placeholder="예: 10000"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-medium-gray text-white rounded-full font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-medium-gray focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-mint-green text-white rounded-full font-medium hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default HourlyRateSettingModal;
