import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { supabase } from '../supabaseClient';

const MonthlyReportModal = ({ isOpen, onClose, selectedMonth, hourlyRate, session }) => {
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [totalWorkHours, setTotalWorkHours] = useState(0);
  const [totalMealAllowance, setTotalMealAllowance] = useState(0);
  const [totalGrossIncome, setTotalGrossIncome] = useState(0);

  useEffect(() => {
    if (isOpen && selectedMonth && session) {
      fetchMonthlyRecords();
    }
  }, [isOpen, selectedMonth, hourlyRate, session]);

  const fetchMonthlyRecords = async () => {
    if (!session) return;

    const startOfMonth = moment(selectedMonth).startOf('month').format('YYYY-MM-DD');
    const endOfMonth = moment(selectedMonth).endOf('month').format('YYYY-MM-DD');

    const { data, error } = await supabase
      .from('work_records')
      .select('*')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .eq('user_id', session.user.id) // 사용자 ID로 필터링
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching monthly work records:', error);
    } else {
      // 각 기록에 해당하는 시급을 가져와서 계산
      const recordsWithHourlyRate = await Promise.all(data.map(async (record) => {
        const { data: rateData, error: rateError } = await supabase
          .from('hourly_rate_history')
          .select('hourly_rate')
          .eq('user_id', session.user.id)
          .lte('effective_date', record.date)
          .or(`end_date.gte.${record.date},end_date.is.null`)
          .order('effective_date', { ascending: false })
          .limit(1)
          .single();

        if (rateError && rateError.code !== 'PGRST116') {
          console.error(`Error fetching hourly rate for ${record.date}:`, rateError);
          return { ...record, hourly_rate_for_date: 0 }; // 오류 발생 시 0으로 처리
        } else if (rateData) {
          return { ...record, hourly_rate_for_date: rateData.hourly_rate };
        } else {
          return { ...record, hourly_rate_for_date: 0 }; // 시급 정보가 없으면 0으로 처리
        }
      }));

      setMonthlyRecords(recordsWithHourlyRate);
      calculateMonthlySummary(recordsWithHourlyRate);
    }
  };

  const calculateMonthlySummary = (records) => {
    let hours = 0;
    let meal = 0;
    let income = 0;

    records.forEach(record => {
      if (record.start_time && record.end_time) {
        const start = moment(record.start_time, 'HH:mm');
        const end = moment(record.end_time, 'HH:mm');
        let duration = moment.duration(end.diff(start));
        if (end.isBefore(start)) {
          duration = moment.duration(end.add(1, 'day').diff(start));
        }
        hours += duration.asHours();
      }
      meal += record.meal_allowance || 0;
      // Recalculate daily wage based on hourly_rate_for_date
      const dailyCalculatedWage = Math.floor((record.hourly_rate_for_date * (record.end_time && record.start_time ? moment.duration(moment(record.end_time, 'HH:mm').diff(moment(record.start_time, 'HH:mm'))).asHours() : 0)) + Number(record.meal_allowance || 0));
      income += dailyCalculatedWage;
    });

    setTotalWorkHours(hours);
    setTotalMealAllowance(meal);
    setTotalGrossIncome(income);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ease-out">
      <div className="bg-cream-white dark:bg-charcoal-gray rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-dark-navy dark:text-white">
            {moment(selectedMonth).format('YYYY년 M월')} 월급 보고서
          </h2>
          <button onClick={onClose} className="text-medium-gray dark:text-light-gray hover:text-dark-navy dark:hover:text-white text-2xl transition-all duration-200 ease-in-out transform hover:scale-105">
            &times;
          </button>
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
                  일급: {Math.floor((
                    (record.hourly_rate_for_date * (record.end_time && record.start_time ? moment.duration(moment(record.end_time, 'HH:mm').diff(moment(record.start_time, 'HH:mm'))).asHours() : 0)) + Number(record.meal_allowance || 0)
                  )).toLocaleString()}원
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
