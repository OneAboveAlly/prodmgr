// frontend/src/pages/TimeTrackingReportsPage.js
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import timeTrackingApi from '../api/timeTracking.api';
import userApi from '../api/user.api';
import { useAuth } from '../contexts/AuthContext';

// Helper function to format seconds as hours and minutes
const formatDuration = (seconds) => {
  if (!seconds) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const TimeTrackingReportsPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [reportData, setReportData] = useState(null);
  
  // Check permission and redirect if needed
  useEffect(() => {
    if (!hasPermission('timeTracking', 'viewReports')) {
      navigate('/time-tracking');
    }
  }, [hasPermission, navigate]);
  
  // Fetch all users - aktualizacja do nowego formatu danych
  const { data, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(1, 100),
  });
  
  // Ekstrakcja listy użytkowników z nowego formatu danych
  const usersData = data?.users || [];

  useEffect(() => {
    console.log('USERS DATA FROM QUERY:', usersData);
  }, [usersData]);
  
  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: ({ userIds, startDate, endDate }) => 
      timeTrackingApi.getReport(userIds, startDate, endDate).then(res => res.data),
    onSuccess: (data) => {
        console.log("REPORT DATA:", data);
      setReportData(data);
      toast.success('Report generated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to generate report');
    }
  });
  
  // Handle date range changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle user selection
  const handleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };
  
  // Select all users
  const selectAllUsers = () => {
    if (usersData) {
      setSelectedUserIds(usersData.map(user => user.id));
    }
  };
  
  // Deselect all users
  const deselectAllUsers = () => {
    setSelectedUserIds([]);
  };
  
  // Generate the report
  const handleGenerateReport = () => {
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    
    generateReportMutation.mutate({
      userIds: selectedUserIds,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
  };
  
  // Export report to Excel
  const exportToExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No report data to export');
      return;
    }
    
    try {
      // Create worksheet with user summary
      const summaryWs = XLSX.utils.json_to_sheet(
        reportData.map(user => ({
          'User': user.name,
          'Total Work Hours': formatDuration(user.totalWorkDuration),
          'Total Break Hours': formatDuration(user.totalBreakDuration),
          'Work Days': Object.keys(user.dailyData).length
        }))
      );
      
      // Create detailed worksheet with daily data
      const detailedData = [];
      
      // Flatten the data structure for Excel
      reportData.forEach(user => {
        user.dailyData.forEach(day => {
          detailedData.push({
            'User': user.name,
            'Date': day.date,
            'Work Hours': formatDuration(day.workDuration),
            'Break Hours': formatDuration(day.breakDuration),
            'Sessions': day.sessions.length
          });
        });
      });
      
      const detailedWs = XLSX.utils.json_to_sheet(detailedData);
      
      // Create a new worksheet for session notes
      const notesData = [];
      
      // Add session notes to a separate sheet
      reportData.forEach(user => {
        user.dailyData.forEach(day => {
          day.sessions.forEach(session => {
            if (session.notes) {
              notesData.push({
                'User': user.name,
                'Date': new Date(session.startTime).toLocaleDateString(),
                'Start Time': new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                'End Time': session.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
                'Duration': formatDuration(session.duration),
                'Notes': session.notes
              });
            }
          });
        });
      });
      
      const notesWs = XLSX.utils.json_to_sheet(notesData);
      
      // Create a new workbook and append the worksheets
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
      XLSX.utils.book_append_sheet(wb, detailedWs, 'Daily Details');
      XLSX.utils.book_append_sheet(wb, notesWs, 'Session Notes');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const fileData = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      // Define filename with current date
      const fileName = `time_tracking_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      // Save file
      saveAs(fileData, fileName);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  // If the user doesn't have the required permission, we don't render anything
  // The useEffect above will handle the redirect
  if (!hasPermission('timeTracking', 'viewReports')) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Time Tracking Reports</h1>
        <div className="flex space-x-2">
          <Link
            to="/time-tracking/users-activity"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Monitor Active Users
          </Link>
          <button
            onClick={() => navigate('/time-tracking')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Back to Time Tracking
          </button>
        </div>
      </div>
      
      {/* Report Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
        
        {/* Date Range Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Date Range</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                min={dateRange.startDate}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
        </div>
        
        {/* User Selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Select Users</h3>
            <div className="space-x-2">
              <button
                onClick={() => {
                  selectAllUsers();
                  console.log('Select All clicked, selectedUserIds:', usersData?.map(user => user.id));
                }}
                className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              >
                Select All
              </button>
              <button
                onClick={deselectAllUsers}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          {usersLoading ? (
            <div className="text-center py-4">Loading users...</div>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
              {console.log('Rendering user list, count:', usersData?.length)}
              {Array.isArray(usersData) && usersData.map(user => {
                console.log('Rendering user:', user.id, user.firstName, user.lastName);
                return (
                  <div key={user.id} className="flex items-center p-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleUserSelection(user.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`user-${user.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                      {user.firstName} {user.lastName}
                    </label>
                  </div>
                );
              })}
              
              {(!usersData || usersData.length === 0) && (
                <div className="p-4 text-center text-gray-500">No users found</div>
              )}
            </div>
          )}
        </div>
        
        {/* Generate Report Button */}
        <div className="flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={generateReportMutation.isPending || selectedUserIds.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
      
      {/* Report Results */}
      {reportData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Report Results</h2>
            {hasPermission('timeTracking', 'exportReports') && (
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Export to Excel
              </button>
            )}
          </div>
          
          {/* Summary Table */}
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Work Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Break Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Days
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map(user => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(user.totalWorkDuration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(user.totalBreakDuration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.dailyData.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Detailed Data Accordion */}
          <div className="border border-gray-200 rounded-md divide-y">
            {reportData.map(user => (
              <details key={user.userId} className="group">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-sm text-gray-500">
                    {user.dailyData.length} days, {formatDuration(user.totalWorkDuration)} worked
                  </span>
                </summary>
                <div className="p-4 bg-gray-50">
                  {user.dailyData.length === 0 ? (
                    <p className="text-center text-gray-500 py-2">No data for selected date range</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Work Time
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Break Time
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Sessions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {user.dailyData.sort((a, b) => new Date(b.date) - new Date(a.date)).map(day => (
                          <tr key={day.date} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {new Date(day.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(day.workDuration)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(day.breakDuration)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {day.sessions.length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTrackingReportsPage;