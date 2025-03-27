// frontend/src/components/timeTracking/WorkSessionsList.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import timeTrackingApi from '../../api/timeTracking.api';

// Helper function to format seconds as hours and minutes
const formatDuration = (seconds) => {
  if (!seconds) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const WorkSessionsList = ({ userId = null }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [filter, setFilter] = useState({
    from: '',
    to: ''
  });
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [noteText, setNoteText] = useState('');
  
  // Fetch user sessions with pagination
  const { 
    data,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['userSessions', userId, page, limit, filter],
    queryFn: () => userId
      ? timeTrackingApi.getUserSessionsById(userId, page, limit, filter).then(res => res.data)
      : timeTrackingApi.getUserSessions(page, limit, filter).then(res => res.data),
  });
  
  // Add the mutation for updating notes
  const updateNotesMutation = useMutation({
    mutationFn: ({ sessionId, notes }) => timeTrackingApi.updateSessionNotes(sessionId, notes),
    onSuccess: () => {
      toast.success('Notes updated successfully');
      setEditingSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['userSessions'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update notes');
    }
  });
  
  // Handle date filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1); // Reset to first page when changing filters
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  // Handle notes editing
  const startEditingNotes = (session) => {
    setEditingSessionId(session.id);
    setNoteText(session.notes || '');
  };

  const saveNotes = () => {
    updateNotesMutation.mutate({
      sessionId: editingSessionId,
      notes: noteText
    });
  };

  const cancelEditingNotes = () => {
    setEditingSessionId(null);
    setNoteText('');
  };
  
  if (isLoading) {
    return <div className="text-center py-8">Loading sessions...</div>;
  }
  
  if (isError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error: {error.message || 'Failed to load sessions'}
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Filter controls */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              name="from"
              value={filter.from}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              name="to"
              value={filter.to}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Summary stats */}
      {data?.stats && (
        <div className="p-4 border-b border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Total Work Time</div>
            <div className="text-xl font-semibold text-indigo-700">{formatDuration(data.stats.totalWorkDuration)}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Total Break Time</div>
            <div className="text-xl font-semibold text-green-700">{formatDuration(data.stats.totalBreakDuration)}</div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Total Sessions</div>
            <div className="text-xl font-semibold text-blue-700">{data.stats.totalSessions}</div>
          </div>
        </div>
      )}
      
      {/* Sessions list */}
      <div className="divide-y divide-gray-200">
        {data?.sessions?.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No work sessions found for the selected time period.
          </div>
        ) : (
          data?.sessions?.map(session => (
            <div key={session.id} className="p-4 hover:bg-gray-50">
              <div className="flex flex-wrap justify-between">
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
                  <div className="text-sm text-gray-500 mt-1">
                    Duration: {formatDuration(session.totalDuration)}
                    {session.breaks?.length > 0 && ` (${session.breaks.length} breaks: ${
                      formatDuration(session.breaks.reduce((total, b) => total + (b.duration || 0), 0))
                    })`}
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    session.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {session.status === 'active' ? 'Active' : 'Completed'}
                  </span>
                </div>
              </div>
              
              {/* Notes section */}
              <div className="mt-2">
                {editingSessionId === session.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                      rows="3"
                      placeholder="Enter your notes for this session..."
                    ></textarea>
                    <div className="flex space-x-2 justify-end">
                      <button
                        onClick={cancelEditingNotes}
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveNotes}
                        disabled={updateNotesMutation.isPending}
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        {updateNotesMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">
                      <strong className="text-gray-700">Notes:</strong>{' '}
                      {session.notes ? (
                        <span className="whitespace-pre-line">{session.notes}</span>
                      ) : (
                        <span className="text-gray-400 italic">No notes</span>
                      )}
                    </div>
                    <button
                      onClick={() => startEditingNotes(session)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      {session.notes ? 'Edit' : 'Add notes'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {data.pagination.pages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === data.pagination.pages}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                page === data.pagination.pages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkSessionsList;