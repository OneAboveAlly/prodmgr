import React from 'react';
import { normalizeGuideData } from '../../utils/guideUtils';

/**
 * Reusable progress bar component for production guides
 * Enhanced with data normalization and debugging
 */
const ProgressBar = ({ guide, className = "", compact = false }) => {
  // Normalize guide data to ensure consistent structure
  const normalizedGuide = normalizeGuideData(guide);
  
  // Safety check for missing data
  if (!normalizedGuide || !normalizedGuide.steps || normalizedGuide.steps.length === 0) {
    console.debug('ProgressBar: Missing guide data or steps', guide);
    return null;
  }
  
  // Calculate progress using the same logic across all pages
  const calculateProgress = () => {
    try {
      // Validate and fix inconsistent data
      const steps = normalizedGuide.steps.map(step => ({
        ...step,
        estimatedTime: Number(step.estimatedTime || 0),
        actualTime: Number(step.actualTime || 0),
        // Fix for completed steps with no time - assume they took estimated time
        ...(step.status === 'COMPLETED' && Number(step.actualTime || 0) === 0 ? 
            { actualTime: Number(step.estimatedTime || 0) } : {})
      }));

      // Calculate time totals using fixed data
      const totalEstimatedTime = steps.reduce((sum, step) => sum + step.estimatedTime, 0);
      const totalActualTime = steps.reduce((sum, step) => sum + step.actualTime, 0);
      
      // Always prefer time-based calculation when estimated time exists
      if (totalEstimatedTime > 0) {
        const progress = Math.min(100, Math.round((totalActualTime / totalEstimatedTime) * 100));
        return progress;
      }
      
      // Fall back to step-based progress ONLY when no time data available
      const totalSteps = steps.length;
      const completedSteps = steps.filter(step => step.status === 'COMPLETED').length;
      const progress = Math.round((completedSteps / totalSteps) * 100);
      return progress;
    } catch (error) {
      console.error('Error calculating progress:', error, normalizedGuide);
      return 0; // Safe default
    }
  };
  
  const progressPercent = calculateProgress();
  
  // Get time data consistently
  const totalActualTime = normalizedGuide.stats?.time?.totalActualTime || 
    normalizedGuide.steps.reduce((sum, step) => sum + (Number(step.actualTime) || 0), 0) || 0;
    
  const totalEstimatedTime = normalizedGuide.stats?.time?.totalEstimatedTime || 
    normalizedGuide.steps.reduce((sum, step) => sum + (Number(step.estimatedTime) || 0), 0) || 0;
    
  const completedSteps = normalizedGuide.steps.filter(s => s.status === 'COMPLETED').length || 0;
  
  // Use compact styling when used in cards/list views
  const headingClass = compact ? "text-sm font-medium" : "text-lg font-semibold";
  const containerClass = compact ? "mt-4" : "mt-6";
  
  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <h2 className={headingClass}>Progress</h2>
        <span className="text-sm font-medium text-gray-700">{progressPercent}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>
          Time: {totalActualTime} / {totalEstimatedTime} min
        </span>
        <span>
          Steps: {completedSteps} / {normalizedGuide.steps.length || 0}
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
