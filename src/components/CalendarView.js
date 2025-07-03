import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import moment from 'moment';
import { supabase } from '../supabaseClient';
import DailyRecordModal from './DailyRecordModal';
import MonthlyReportModal from './MonthlyReportModal';

const CalendarView = ({ hourlyRate, onOpenHourlyRateModal, session }) => {
  const [date, setDate] = useState(new Date());
  const [workRecords, setWorkRecords] = useState([]);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [selectedDateForDailyModal, setSelectedDateForDailyModal] = useState(null);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [selectedMonthForMonthlyModal, setSelectedMonthForMonthlyModal] = useState(new Date());

  useEffect(() => {
    if (session) {
      fetchWorkRecords();
    }
  }, [session]);

  const fetchWorkRecords = async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from('work_records')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error fetching work records:', error);
    } else {
      console.log('Fetched work records:', data);
      setWorkRecords(data);
    }
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
    setSelectedDateForDailyModal(newDate);
    setIsDailyModalOpen(true);
  };

  const handleDailyModalClose = () => {
    setIsDailyModalOpen(false);
    setSelectedDateForDailyModal(null);
  };

  const handleMonthlyModalOpen = () => {
    setSelectedMonthForMonthlyModal(date); // 현재 달력을 보고 있는 달을 기준으로 설정
    setIsMonthlyModalOpen(true);
  };

  const handleMonthlyModalClose = () => {
    setIsMonthlyModalOpen(false);
  };

  const handleRecordSave = () => {
    fetchWorkRecords(); // 데이터 저장/삭제 후 목록 새로고침
  };

  // 각 날짜에 근무 시간 표시 (예시)
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const record = workRecords.find(rec => rec.date === formattedDate);
      if (record && (record.start_time || record.end_time)) { // 근무 시간이 있는 경우
        const start = moment(record.start_time, 'HH:mm');
        const end = moment(record.end_time, 'HH:mm');
        let duration = moment.duration(end.diff(start));
        if (end.isBefore(start)) {
          duration = moment.duration(end.add(1, 'day').diff(start));
        }
        const hours = duration.asHours();
        if (hours > 0) {
          return (
            <div className="absolute -top-1 -right-1 text-xs text-coral-pink font-semibold p-1">
              {Math.floor(hours)}h
            </div>
          );
        }
      }
    }
    return null;
  };

  return (
    <div className="p-4">
      <Calendar
        onChange={handleDateChange}
        value={date}
        tileContent={tileContent}
        weekStartsOn={0}
        locale="en-US"
        className="react-calendar-custom border-none rounded-lg shadow-lg p-4 bg-cream-white dark:bg-charcoal-gray"
      />
      <button
        onClick={handleMonthlyModalOpen}
        className="w-full mt-4 px-4 py-3 bg-mint-green text-white rounded-lg text-lg font-semibold shadow-md
                   hover:bg-mint-green focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105"
      >
        월급 확인
      </button>
      <button
        onClick={onOpenHourlyRateModal}
        className="w-full mt-2 px-4 py-3 bg-lemon-yellow text-dark-navy rounded-lg text-lg font-semibold shadow-md
                   hover:bg-lemon-yellow focus:outline-none focus:ring-2 focus:ring-lemon-yellow focus:ring-opacity-50
                   transition-all duration-300 ease-in-out transform hover:scale-105"
      >
        시급 설정
      </button>
      <DailyRecordModal
        selectedDate={selectedDateForDailyModal}
        isOpen={isDailyModalOpen}
        onClose={handleDailyModalClose}
        onSave={handleRecordSave}
        hourlyRate={hourlyRate}
        session={session}
      />
      <MonthlyReportModal
        selectedMonth={selectedMonthForMonthlyModal}
        isOpen={isMonthlyModalOpen}
        onClose={handleMonthlyModalClose}
        hourlyRate={hourlyRate}
        session={session}
      />
    </div>
  );
};

export default CalendarView;