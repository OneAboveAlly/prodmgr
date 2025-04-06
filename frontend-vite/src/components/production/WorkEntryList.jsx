// frontend-vite/src/components/production/WorkEntryList.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import productionApi from '../../api/production.api';

const WorkEntryList = ({ stepId }) => {
  // Fetch work entries
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stepWorkEntries', stepId],
    queryFn: () => productionApi.getStepWorkEntries(stepId),
    onError: (error) => {
      toast.error(`Error loading work entries: ${error.message}`);
    }
  });

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return 'N/A';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  // Format date/time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Work Entries</h3>
        <div className="text-center py-4 text-gray-500">Loading work entries...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Work Entries</h3>
        <div className="text-center py-4 text-red-500">Failed to load work entries.</div>
      </div>
    );
  }

  const entries = data?.entries || [];
  const userTotals = data?.userTotals || [];
  const totalTime = data?.totalTime || 0;

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Work Entries</h3>
      
      {entries.length > 0 ? (
        <div>
          {/* Summary */}
          <div className="mb-4 bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium">Total Time: {formatDuration(totalTime)}</h4>
            </div>
            {userTotals.length > 0 && (
              <div className="mt-2">
                <h5 className="text-sm font-medium mb-1">Contributions by User:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {userTotals.map(user => (
                    <div key={user.userId} className="text-sm">
                      <span className="font-medium">{user.firstName} {user.lastName}:</span> {formatDuration(user.totalTime)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Entries table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                      {entry.user?.firstName} {entry.user?.lastName}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(entry.timeWorked)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No work entries have been recorded for this step.
        </div>
      )}
    </div>
  );
};

export default WorkEntryList;