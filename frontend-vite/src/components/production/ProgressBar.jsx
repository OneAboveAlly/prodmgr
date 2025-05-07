// frontend-vite/src/components/production/ProgressBar.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { calculateGuideProgress } from '../../utils/progressCalculator';
import api from '../../services/api.service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Tooltip } from 'react-tooltip';

/**
 * Ultra simplified progress bar component for production guides
 * Direct calculation without any dependencies
 */
const ProgressBar = ({ guide, compact = false, autoUpdateStatus = true, className = '' }) => {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [tooltipId] = useState(`progress-tooltip-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (guide && guide.steps) {
      // Użyj nowej wersji funkcji calculateGuideProgress, która zwraca liczbę
      const calculatedProgress = calculateGuideProgress(guide);
      setProgress(calculatedProgress);
    }
  }, [guide]);

  // Funkcja do aktualizacji statusu przewodnika, gdy postęp osiągnie 100%
  const updateGuideStatusWhenComplete = async () => {
    if (
      autoUpdateStatus &&
      guide?.id && 
      progress >= 100 && 
      guide.status !== 'COMPLETED'
    ) {
      try {
        await api.put(`/production/guides/${guide.id}`, {
          status: 'COMPLETED'
        });
        
        // Odświeżenie cache po aktualizacji
        queryClient.invalidateQueries({ queryKey: ['productionGuide', guide.id] });
        queryClient.invalidateQueries({ queryKey: ['productionGuides'] });
        
        toast.success('Status przewodnika zaktualizowany do "Zakończony"');
      } catch (error) {
        console.error('Error updating guide status:', error);
      }
    }
  };

  // Efekt, który uruchamia aktualizację statusu przy zmianach procentu ukończenia
  useEffect(() => {
    if (progress >= 100) {
      updateGuideStatusWhenComplete();
    }
  }, [progress, guide?.id, guide?.status]);
  
  // Safety check for missing data
  if (!guide || !guide.steps) {
    return null;
  }

  // Color classes based on progress
  let colorClass = 'bg-gray-200'; // default - no progress
  if (progress > 0) colorClass = 'bg-blue-500';
  if (progress >= 75) colorClass = 'bg-green-500';
  if (progress === 100) colorClass = 'bg-emerald-600';

  // For compact view (in lists)
  if (compact) {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex justify-end items-center mb-1">
          <span className="text-xs font-medium text-gray-600">{progress}%</span>
        </div>
        <div 
          className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden"
          data-tooltip-id={tooltipId}
          data-tooltip-content={`Postęp: ${progress}%`}
        >
          <div
            className={`h-full ${colorClass} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          ></div>
          <Tooltip id={tooltipId} />
        </div>
      </div>
    );
  }

  // For detailed view
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">
          Postęp prac
        </span>
        <span className="text-sm font-medium">{progress}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {progress >= 100 && guide.status !== 'COMPLETED' && autoUpdateStatus && (
        <div className="text-xs text-green-600 mt-1 animate-pulse">
          Automatyczna aktualizacja statusu na Zakończony...
        </div>
      )}
    </div>
  );
};

ProgressBar.propTypes = {
  guide: PropTypes.object.isRequired,
  compact: PropTypes.bool,
  autoUpdateStatus: PropTypes.bool,
  className: PropTypes.string
};

export default ProgressBar;