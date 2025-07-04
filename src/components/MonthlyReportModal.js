import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { supabase } from '../supabaseClient';

const MonthlyReportModal = ({ isOpen, onClose, selectedMonth, session, jobs }) => {
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [totalWorkHours, setTotalWorkHours] = useState(0);
  const [totalMealAllowance, setTotalMealAllowance] = useState(0);
  const [totalGrossIncome, setTotalGrossIncome] = useState(0);
  const [selectedJobFilterId, setSelectedJobFilterId] = useState('all'); // 선택된 직업 필터 ID 상태 ('all' 또는 job.id)

  const [showModal, setShowModal] = useState(false); // 모달의 실제 렌더링 여부
  const [animateModal, setAnimateModal] = useState(false); // 애니메이션 클래스 적용 여부

  useEffect(() => {
    if (isOpen) {
      setShowModal(true); // 모달을 DOM에 렌더링 시작
      setTimeout(() => setAnimateModal(true), 10); // 약간의 지연 후 애니메이션 시작
    } else {
      setAnimateModal(false); // 애니메이션 역재생 시작
      setTimeout(() => setShowModal(false), 300); // 애니메이션 완료 후 DOM에서 제거 (300ms는 transition-duration과 일치)
    }
  }, [isOpen]);

  const calculateMonthlySummary = useCallback((records) => {
    let totalIncome = 0;
    let totalHours = 0;
    let totalMeal = 0;

    records.forEach(record => {
      totalIncome += record.daily_wage || 0;
      totalMeal += record.meal_allowance || 0;

      if (record.start_time && record.end_time) {
        const start = moment(record.start_time, 'HH:mm');
        const end = moment(record.end_time, 'HH:mm');
        let duration = moment.duration(end.diff(start));
        if (end.isBefore(start)) {
          duration = moment.duration(end.add(1, 'day').diff(start));
        }
        totalHours += duration.asHours();
      }
    });

    setTotalGrossIncome(totalIncome);
    setTotalWorkHours(totalHours);
    setTotalMealAllowance(totalMeal);
  }, []);

  const fetchMonthlyRecords = useCallback(async () => {
    if (!session) return;

    const startOfMonth = moment(selectedMonth).startOf('month').format('YYYY-MM-DD');
    const endOfMonth = moment(selectedMonth).endOf('month').format('YYYY-MM-DD');

    let query = supabase
      .from('work_records')
      .select('*, jobs(job_name)')
      .eq('user_id', session.user.id)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (selectedJobFilterId !== 'all') {
      query = query.eq('job_id', selectedJobFilterId);
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (error) {
      console.error('Error fetching monthly work records:', error);
      setMonthlyRecords([]);
    } else {
      setMonthlyRecords(data || []);
      calculateMonthlySummary(data || []);
    }
  }, [session, selectedMonth, selectedJobFilterId, calculateMonthlySummary]);

  useEffect(() => {
    if (isOpen && selectedMonth && session) {
      fetchMonthlyRecords();
    }
  }, [isOpen, selectedMonth, session, fetchMonthlyRecords]);

  if (!showModal) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-out ${animateModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-cream-white dark:bg-charcoal-gray rounded-lg shadow-lg p-6 w-full max-w-md mx-4 transform transition-all duration-300 ease-out ${animateModal ? 'translate-y-0' : 'translate-y-10'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-dark-navy dark:text-white">
            {moment(selectedMonth).format('YYYY년 M월')} 월급 보고서
          </h2>
          <button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
            &times;
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="jobFilter" className="block text-sm font-medium text-medium-gray dark:text-light-gray mb-1">
            직업 필터
          </label>
          <select
            id="jobFilter"
            value={selectedJobFilterId}
            onChange={(e) => setSelectedJobFilterId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-mint-green focus:border-mint-green sm:text-sm bg-cream-white dark:bg-charcoal-gray text-dark-navy dark:text-white"
          >
            <option value="all">모든 직업</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>{job.job_name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-dark-navy dark:text-white">
            <span className="font-semibold">총 근무 시간:</span> {totalWorkHours.toFixed(1)} 시간
          </p>
          <p className="text-dark-navy dark:text-white">
            <span className="font-semibold">총 식대:</span> {totalMealAllowance.toLocaleString()}원
          </p>
          <p className="text-3xl font-bold text-mint-green">
            총 수입: {totalGrossIncome.toLocaleString()}원
          </p>
        </div>

        <h3 className="text-lg font-semibold text-dark-navy dark:text-white mb-3">일별 상세 내역</h3>
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
          {monthlyRecords.length === 0 ? (
            <p className="text-medium-gray dark:text-light-gray text-center py-4">기록된 내역이 없습니다.</p>
          ) : (
            monthlyRecords.map((record) => (
              <div key={record.id} className="border-b border-gray-100 py-2 last:border-b-0 shadow-md bg-cream-white dark:bg-charcoal-gray">
                <p className="text-sm text-dark-navy dark:text-white font-medium">
                  {moment(record.date).format('M월 D일 (ddd)')}
                  {record.jobs && record.jobs.job_name && (
                    <span className="ml-2 text-xs text-mint-green">({record.jobs.job_name})</span>
                  )}
                </p>
                <p className="text-xs text-medium-gray dark:text-light-gray ml-2">
                  근무: {record.start_time || ''} ~ {record.end_time || ''} ({
                    record.start_time && record.end_time
                      ? moment.duration(moment(record.end_time, 'HH:mm').diff(moment(record.start_time, 'HH:mm'))).asHours().toFixed(1)
                      : '0.0'
                  }시간)
                </p>
                <p className="text-xs text-medium-gray dark:text-light-gray ml-2">
                  식대: {record.meal_allowance.toLocaleString()}원
                </p>
                <p className="text-sm text-dark-navy dark:text-white ml-2 font-semibold">
                  일급: {(record.daily_wage || 0).toLocaleString()}원
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-mint-green text-white rounded-lg hover:bg-mint-green-dark focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50 text-lg font-semibold transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReportModal;
