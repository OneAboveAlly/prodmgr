/**
 * Utility functions for calculating progress consistently across the application
 */

/**
 * Calculates the progress percentage for a production guide
 * @param {Object} guide - The production guide object
 * @returns {number} - Progress percentage (0-100)
 */
export const calculateGuideProgress = (guide) => {
  if (!guide?.steps || guide.steps.length === 0) return 0;
  
  // If we have time stats available, use those for more accurate progress
  if (guide.stats?.time) {
    const { totalActualTime, totalEstimatedTime } = guide.stats.time;
    if (totalEstimatedTime && totalEstimatedTime > 0) {
      return Math.min(100, Math.round((totalActualTime / totalEstimatedTime) * 100));
    }
  }
  
  // Time-based calculation as fallback
  const totalEstimatedTime = guide.steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0);
  const totalActualTime = guide.steps.reduce((sum, step) => sum + (step.actualTime || 0), 0);
  
  if (totalEstimatedTime > 0) {
    return Math.min(100, Math.round((totalActualTime / totalEstimatedTime) * 100));
  }
  
  // Fall back to step-based progress when no time data is available
  const totalSteps = guide.steps.length;
  const completedSteps = guide.steps.filter(step => step.status === 'COMPLETED').length;
  
  return Math.round((completedSteps / totalSteps) * 100);
};

/**
 * Returns time-related statistics for a guide
 * @param {Object} guide - The production guide object
 * @returns {Object} - Time statistics
 */
export const getTimeStats = (guide) => {
  if (!guide?.steps) return { totalActualTime: 0, totalEstimatedTime: 0 };
  
  // Use pre-calculated stats if available
  if (guide.stats?.time) {
    return {
      totalActualTime: guide.stats.time.totalActualTime || 0,
      totalEstimatedTime: guide.stats.time.totalEstimatedTime || 0
    };
  }
  
  // Calculate from steps if stats not available
  return {
    totalActualTime: guide.steps.reduce((sum, step) => sum + (step.actualTime || 0), 0),
    totalEstimatedTime: guide.steps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0)
  };
};
