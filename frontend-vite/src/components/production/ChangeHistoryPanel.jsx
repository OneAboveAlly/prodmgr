import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import productionApi from '../../api/production.api';

const ChangeHistoryPanel = ({ stepId }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: changeHistory, isLoading } = useQuery({
    queryKey: ['changeHistory', stepId],
    queryFn: () => productionApi.getStepChangeHistory(stepId),
    enabled: isExpanded, // Only fetch when panel is expanded
  });

  const formatChangeDescription = (change) => {
    switch (change.field) {
      case 'status':
        return `changed status from "${change.oldValue}" to "${change.newValue}"`;
      case 'assignedUsers':
        return `updated assigned users`;
      case 'priority':
        return `changed priority from "${change.oldValue}" to "${change.newValue}"`;
      case 'title':
        return `updated title`;
      case 'description':
        return `updated description`;
      case 'estimatedTime':
        return `changed estimated time from ${change.oldValue} to ${change.newValue} minutes`;
      case 'startedWork':
        return `started working on this step`;
      case 'completedWork':
        return `completed work on this step`;
      default:
        return `updated ${change.field}`;
    }
  };

  // Group changes by date
  const groupChangesByDate = (changes) => {
    if (!changes || !changes.length) return {};
    
    return changes.reduce((groups, change) => {
      const date = new Date(change.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(change);
      return groups;
    }, {});
  };

  const groupedChanges = groupChangesByDate(changeHistory);

  return (
    <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
      <div 
        className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold">Change History</h3>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isExpanded && (
        <div className="px-4 py-3 bg-white">
          {isLoading ? (
            <p className="text-center py-4 text-gray-500">Loading change history...</p>
          ) : changeHistory && changeHistory.length > 0 ? (
            <div>
              {Object.entries(groupedChanges).map(([date, changes]) => (
                <div key={date} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 bg-gray-50 py-1 px-2 rounded">
                    {date}
                  </h4>
                  <ul className="mt-2 border-l-2 border-gray-200 pl-4 space-y-3">
                    {changes.map((change) => (
                      <li key={change.id} className="relative">
                        <div className="absolute w-2 h-2 bg-indigo-500 rounded-full -left-5 top-2"></div>
                        <div className="text-sm">
                          <span className="font-medium">
                            {change.user?.firstName} {change.user?.lastName}
                          </span>{' '}
                          {formatChangeDescription(change)}
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(change.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-500">No changes recorded for this step.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ChangeHistoryPanel;
