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
    if (!step) return {}; // Handle null/undefined step
    
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
    // Debug the incoming guide data
    console.debug('Normalizing guide data:', guide?.id, guide?.title);
    
    // Handle different API response formats
    const guideData = guide.guide || guide;
    
    // Check if guide data is valid
    if (!guideData || typeof guideData !== 'object') {
      console.error('Invalid guide data:', guideData);
      return null;
    }
    
    // Ensure steps array exists and process time data
    const normalizedSteps = processStepTimeData(guideData.steps || []);
    
    // Calculate time totals from steps
    const totalEstimatedTime = normalizedSteps.reduce((sum, step) => sum + step.estimatedTime, 0);
    const totalActualTime = normalizedSteps.reduce((sum, step) => sum + step.actualTime, 0);
    
    // Ensure stats has proper structure with derived data if missing
    const stats = guideData.stats || {};
    const timeStats = stats.time || {};
    
    // Include derived time progress calculation directly in stats
    const timeBasedProgress = totalEstimatedTime > 0 ? 
      Math.min(100, Math.round((totalActualTime / totalEstimatedTime) * 100)) : 0;
    
    const normalizedStats = {
      ...stats,
      time: {
        ...timeStats,
        totalActualTime: Number(timeStats.totalActualTime) || totalActualTime,
        totalEstimatedTime: Number(timeStats.totalEstimatedTime) || totalEstimatedTime,
        progress: Number(timeStats.progress) || timeBasedProgress
      }
    };
    
    // Calculate step status counts
    const stepsStats = stats.steps || {};
    const completedSteps = normalizedSteps.filter(s => s.status === 'COMPLETED').length;
    const inProgressSteps = normalizedSteps.filter(s => s.status === 'IN_PROGRESS').length;
    const pendingSteps = normalizedSteps.filter(s => s.status === 'PENDING').length;
    
    // Update step stats
    const normalizedStepStats = {
      ...stepsStats,
      total: normalizedSteps.length,
      completed: stepsStats.completed || completedSteps,
      inProgress: stepsStats.inProgress || inProgressSteps,
      pending: stepsStats.pending || pendingSteps
    };
    
    // Calculate steps-based progress
    const stepBasedProgress = normalizedSteps.length > 0 ? 
      Math.round((completedSteps / normalizedSteps.length) * 100) : 0;
    
    // Build the final normalized guide
    const normalizedGuide = {
      ...guideData,
      steps: normalizedSteps,
      stats: {
        ...normalizedStats,
        steps: normalizedStepStats,
        progress: {
          byTime: timeBasedProgress,
          bySteps: stepBasedProgress
        }
      }
    };
    
    // Log normalized data for debugging
    console.debug('Normalized guide data:', {
      id: normalizedGuide.id,
      title: normalizedGuide.title,
      totalSteps: normalizedGuide.steps.length,
      timeStats: normalizedGuide.stats.time,
      stepStats: normalizedGuide.stats.steps,
      progressStats: normalizedGuide.stats.progress
    });
    
    return normalizedGuide;
  } catch (error) {
    console.error('Error normalizing guide data:', error, guide);
    return guide; // Return original data as fallback
  }
};
