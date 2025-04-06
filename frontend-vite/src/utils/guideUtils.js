/**
 * Utility functions for working with guide data
 */

/**
 * Ensures all guide steps have proper time data
 * @param {Array} steps - Guide steps array
 * @returns {Array} - Processed steps with time data
 */
const processStepTimeData = (steps) => {
  if (!steps || !Array.isArray(steps)) return [];
  
  return steps.map(step => {
    const estimatedTime = Number(step.estimatedTime || 0);
    const actualTime = Number(step.actualTime || 0);
    
    // For completed steps with no actual time, set actual = estimated
    const processedActualTime = 
      step.status === 'COMPLETED' && actualTime === 0 ? estimatedTime : actualTime;
    
    return {
      ...step,
      estimatedTime,
      actualTime: processedActualTime,
    };
  });
};

/**
 * Normalizes guide data to ensure consistent structure
 * @param {Object} guide - The guide object to normalize
 * @returns {Object} - Normalized guide object
 */
export const normalizeGuideData = (guide) => {
  if (!guide) return null;
  
  try {
    // Handle different API response formats
    const guideData = guide.guide || guide;
    
    // Ensure steps array exists and process time data
    const normalizedSteps = processStepTimeData(guideData.steps || []);
    
    // Calculate time totals from steps
    const totalEstimatedTime = normalizedSteps.reduce((sum, step) => sum + step.estimatedTime, 0);
    const totalActualTime = normalizedSteps.reduce((sum, step) => sum + step.actualTime, 0);
    
    // Ensure stats has proper structure with derived data if missing
    const stats = guideData.stats || {};
    const timeStats = stats.time || {};
    
    const normalizedStats = {
      ...stats,
      time: {
        ...timeStats,
        totalActualTime: Number(timeStats.totalActualTime) || totalActualTime,
        totalEstimatedTime: Number(timeStats.totalEstimatedTime) || totalEstimatedTime
      }
    };
    
    // Return normalized guide
    return {
      ...guideData,
      steps: normalizedSteps,
      stats: normalizedStats
    };
  } catch (error) {
    console.error('Error normalizing guide data:', error, guide);
    return guide; // Return original data as fallback
  }
};
