// frontend/src/components/timeTracking/MonthlyCalendar.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import timeTrackingApi from '../../api/timeTracking.api';

// Helper function to format seconds as hours and minutes
const formatDuration = (seconds) => {
  if (!seconds) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const MonthlyCalendar = ({ selectedMonth, onMonthChange }) => {
  const currentDate = selectedMonth || new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Fetch daily summaries for the selected month
  const { data: dailySummaries, isLoading } = useQuery({
    queryKey: ['dailySummaries', year, month],
    queryFn: () => timeTrackingApi.getDailySummaries(year, month).then(res => res.data),
  });
  
  // Create a map of dates to their summary data for quick lookup
  const summariesByDate = {};
  if (dailySummaries) {
    dailySummaries.forEach(summary => {
      summariesByDate[summary.date] = summary;
    });
  }
  
  // Generate calendar data
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(year, month - 2, 1); // month is 1-indexed here
    onMonthChange(newDate);
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(year, month, 1); // month is 1-indexed here
    onMonthChange(newDate);
  };
  
  // Get month name
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
  
  // Generate calendar days
  const calendarDays = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-200"></div>);
  }
  
  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const summary = summariesByDate[date];
    const isToday = date === today;
    
    calendarDays.push(
      <div 
        key={date} 
        className={`h-24 p-2 border border-gray-200 overflow-hidden ${
          isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
        }`}
      >
        <div className="flex justify-between">
          <span className={`font-medium ${isToday ? 'text-blue-600' : ''}`}>{day}</span>
          {summary && (
            <span className="text-xs px-1 bg-green-100 text-green-800 rounded">
              {formatDuration(summary.workDuration)}
            </span>
          )}
        </div>
        
        {summary?.leaves?.map((leave, i) => (
          <div 
            key={`${date}-leave-${i}`}
            className="mt-1 truncate text-xs px-1 py-0.5 rounded"
            style={{ backgroundColor: `${leave.color}20`, color: leave.color }}
          >
            {leave.halfDay ? 'Half Day' : ''} {leave.type}
          </div>
        ))}
        
        {summary?.sessionCount > 0 && (
          <div className="mt-1 text-xs text-gray-600">
            {summary.sessionCount} session{summary.sessionCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }
  
  // Weekday names
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Calendar header */}
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
        <button
          onClick={goToPreviousMonth}
          className="p-1 rounded-full hover:bg-indigo-500"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-xl font-semibold">
          {monthName} {year}
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-1 rounded-full hover:bg-indigo-500"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      {/* Days of week header */}
      <div className="grid grid-cols-7 bg-gray-100">
        {weekdays.map(day => (
          <div key={day} className="p-2 text-center font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar body */}
      {isLoading ? (
        <div className="p-8 text-center">Loading calendar data...</div>
      ) : (
        <div className="grid grid-cols-7">
          {calendarDays}
        </div>
      )}
      
      {/* Legend */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center">
          <div className="h-3 w-3 bg-blue-50 border border-blue-300 mr-1"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 bg-green-100 mr-1"></div>
          <span>Work time</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 bg-yellow-100 mr-1"></div>
          <span>Leave</span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendar;