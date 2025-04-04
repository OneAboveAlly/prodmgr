import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import productionApi from '../../api/production.api';

const WorkEntryList = ({ stepId }) => {
  // Fetch work entries
  const { data: workEntries, isLoading, isError } = useQuery({
    queryKey: ['stepWorkEntries', stepId],
    queryFn: () => productionApi.getStepWorkEntries(stepId),
    onError: (error) => {
      toast.error(`Error loading work entries: ${error.message}`);
    }
  });

  // Format duration
  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    
    if (!endTime) {
      // If work is still in progress, calculate against current time
      const start = new Date(startTime);
      const now = new Date();
      const diffMinutes = Math.round((now - start) / (1000 * 60));
      return `${diffMinutes} min (in progress)`;
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMinutes = Math.round((end - start) / (1000 * 60));
    return `${diffMinutes} min`;
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
        <h3 className="text-lg font-semibold mb-4">Work Sessions</h3>
        <div className="text-center py-4 text-gray-500">Loading work entries...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Work Sessions</h3>
        <div className="text-center py-4 text-red-500">Failed to load work entries.</div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Work Sessions</h3>
      
      {workEntries && workEntries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ended
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    {entry.user?.firstName} {entry.user?.lastName}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(entry.startTime)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {entry.endTime ? formatDateTime(entry.endTime) : 'In Progress'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(entry.startTime, entry.endTime)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {entry.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No work sessions have been recorded for this step.
        </div>
      )}
    </div>
  );
};

export default WorkEntryList;
