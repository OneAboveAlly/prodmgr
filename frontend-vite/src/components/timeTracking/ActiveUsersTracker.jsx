// frontend/src/components/timeTracking/ActiveUsersTracker.js
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import timeTrackingApi from '../../api/timeTracking.api';
import userApi from '../../api/user.api';

// Helper function to format seconds
const formatDuration = (seconds) => {
  if (!seconds) return '0h 0m 0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
};

const ActiveUsersTracker = ({ filters = {} }) => {
  const [activeSessions, setActiveSessions] = useState({});
  const [elapsedTimes, setElapsedTimes] = useState({});
  const [expandedUser, setExpandedUser] = useState(null);
  
  // Fetch all users - aktualizacja do nowego formatu danych
  const { data, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(1, 100),
  });
  
  // Ekstrakcja listy użytkowników z nowego formatu danych
  const usersData = data?.users || [];
  
  // Log users data when it changes
  useEffect(() => {
    console.log('ACTIVE USERS TRACKER - USERS DATA:', usersData);
  }, [usersData]);
  
  // Fetch active sessions for all users
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['active-sessions', filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      // This is a new endpoint we'll need to create on the backend
      try {
        const response = await timeTrackingApi.getAllActiveSessions({
          from: filters.dateFrom || undefined,
          to: filters.dateTo || undefined
        });
        console.log('ACTIVE SESSIONS API RESPONSE:', response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to fetch active sessions:", error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Log sessions data when it changes
  useEffect(() => {
    console.log('ACTIVE SESSIONS DATA:', sessionsData);
  }, [sessionsData]);
  
  // Fetch user's recent sessions
  const { data: userSessions, isLoading: userSessionsLoading, refetch: refetchUserSessions } = useQuery({
    queryKey: ['user-sessions', expandedUser, filters.dateFrom, filters.dateTo],
    queryFn: () => {
      if (!expandedUser) return { sessions: [] };
      return timeTrackingApi.getUserSessionsById(
        expandedUser, 
        1, 
        10, 
        {
          from: filters.dateFrom || undefined,
          to: filters.dateTo || undefined
        }
      ).then(res => res.data);
    },
    enabled: !!expandedUser,
  });
  
  // Update active sessions when data changes
  useEffect(() => {
    if (sessionsData) {
      const activeSessionsMap = {};
      sessionsData.forEach(session => {
        activeSessionsMap[session.userId] = session;
      });
      console.log('ACTIVE SESSIONS MAP:', activeSessionsMap);
      setActiveSessions(activeSessionsMap);
      
      // Initialize elapsed times
      const initialElapsedTimes = {};
      sessionsData.forEach(session => {
        const startTime = new Date(session.startTime);
        const now = new Date();
        initialElapsedTimes[session.userId] = Math.floor((now - startTime) / 1000);
      });
      setElapsedTimes(prev => ({...prev, ...initialElapsedTimes}));
    }
  }, [sessionsData]);
  
  // Update timer for active sessions
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTimes(prev => {
        const updated = {...prev};
        Object.keys(activeSessions).forEach(userId => {
          if (updated[userId] !== undefined) {
            updated[userId] += 1;
          }
        });
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeSessions]);
  
  // Refresh data when filters change
  useEffect(() => {
    refetchSessions();
    if (expandedUser) {
      refetchUserSessions();
    }
  }, [filters, refetchSessions, expandedUser, refetchUserSessions]);
  
  // Refresh data manually
  const handleRefresh = () => {
    refetchSessions();
    if (expandedUser) {
      refetchUserSessions();
    }
  };
  
  // Toggle user details
  const toggleUserDetails = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };
  
  if (usersLoading || sessionsLoading) {
    return <div className="text-center py-4">Loading user activity data...</div>;
  }
  
  // Apply filters to users list
  const filteredUsers = usersData.filter(user => {
    // Filter by search term
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const username = (user.username || '').toLowerCase();
      
      if (!fullName.includes(searchTerm) && 
          !email.includes(searchTerm) && 
          !username.includes(searchTerm)) {
        return false;
      }
    }
    
    // Filter by status
    if (filters.status && filters.status !== 'all') {
      const isActive = !!activeSessions[user.id];
      if (filters.status === 'active' && !isActive) return false;
      if (filters.status === 'inactive' && isActive) return false;
    }
    
    return true;
  });
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
        <h2 className="text-lg font-semibold">Active Users Tracker</h2>
        <button 
          onClick={handleRefresh}
          className="px-3 py-1 bg-white text-indigo-600 rounded hover:bg-indigo-50"
        >
          Refresh
        </button>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">
          This panel shows real-time activity status of all users. Click on a user to see their recent sessions.
        </p>
        
        {filteredUsers.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded">
            <p className="text-gray-500">No users match your filter criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Session</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(user => {
                  const activeSession = activeSessions[user.id];
                  const isActive = !!activeSession;
                  const elapsedTime = elapsedTimes[user.id] || 0;
                  
                  return (
                    <React.Fragment key={user.id}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleUserDetails(user.id)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isActive ? 'Working' : 'Not Working'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isActive ? (
                            <div>
                              <div className="text-sm text-gray-900">
                                Started: {new Date(activeSession.startTime).toLocaleTimeString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                Duration: {formatDuration(elapsedTime)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No active session</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                          <button onClick={(e) => {
                            e.stopPropagation();
                            toggleUserDetails(user.id);
                          }}>
                            {expandedUser === user.id ? 'Hide Details' : 'Show Details'}
                          </button>
                        </td>
                      </tr>
                      
                      {expandedUser === user.id && (
                        <tr>
                          <td colSpan="4" className="px-6 py-4 bg-gray-50">
                            <h3 className="font-medium text-gray-900 mb-2">Recent Sessions</h3>
                            {userSessionsLoading ? (
                              <p className="text-center py-2">Loading user sessions...</p>
                            ) : userSessions?.sessions?.length === 0 ? (
                              <p className="text-sm text-gray-500">No recent sessions found.</p>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {userSessions?.sessions?.map(session => (
                                  <div key={session.id} className="bg-white p-3 rounded border border-gray-200">
                                    <div className="flex justify-between">
                                      <div>
                                        <div className="font-medium">
                                          {new Date(session.startTime).toLocaleDateString()} ({
                                            new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                          } - {
                                            session.endTime 
                                              ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                              : 'In Progress'
                                          })
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          Duration: {formatDuration(session.totalDuration || 0)}
                                        </div>
                                      </div>
                                      <span className={`px-2 h-fit py-1 text-xs font-semibold rounded-full ${
                                        session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {session.status}
                                      </span>
                                    </div>
                                    {session.notes && (
                                      <div className="mt-2 text-sm">
                                        <div className="font-medium text-gray-700">Notes:</div>
                                        <div className="text-gray-600 whitespace-pre-line">{session.notes}</div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveUsersTracker;