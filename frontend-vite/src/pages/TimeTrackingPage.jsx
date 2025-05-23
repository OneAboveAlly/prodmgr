// frontend/src/pages/TimeTrackingPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import TimeTracker from '../components/timeTracking/TimeTracker';
import MonthlyCalendar from '../components/timeTracking/MonthlyCalendar';
import WorkSessionsList from '../components/timeTracking/WorkSessionsList';
import LeaveRequestButton from '../components/leave/LeaveRequestButton';

const TimeTrackingPage = () => {
  const { hasPermission } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Śledzenie czasu pracy</h1>
        
        <div className="flex gap-2">
          {hasPermission('leave', 'create') && (
            <LeaveRequestButton />
          )}
          
          {hasPermission('timeTracking', 'viewAll') && (
            <Link 
              to="/time-tracking/reports"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Pokaż raporty
            </Link>
          )}
          
          {hasPermission('timeTracking', 'manageSettings') && (
            <Link 
              to="/time-tracking/settings"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Ustawienia
            </Link>
          )}
        </div>
      </div>
      
      {/* Komponent śledzenia czasu */}
      <div className="mb-8">
        <TimeTracker />
      </div>
      
      {/* Miesięczny kalendarz */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Przegląd miesięczny</h2>
        <MonthlyCalendar 
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>
      
      {/* Ostatnie sesje pracy */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ostatnie sesje pracy</h2>
        <WorkSessionsList />
      </div>
    </div>
  );
};

export default TimeTrackingPage;