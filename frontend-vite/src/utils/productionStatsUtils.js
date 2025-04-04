// src/utils/productionStatsUtils.js

/**
 * Calculate statistics for a production guide with steps
 * @param {Object} guide - Production guide object with steps array
 * @returns {Object} Object containing step and time statistics
 */
export const calculateGuideStatistics = (guide) => {
    if (!guide || !guide.steps || !Array.isArray(guide.steps)) {
      return {
        steps: {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0
        },
        time: {
          totalEstimatedTime: 0,
          totalActualTime: 0,
          progress: 0
        }
      };
    }
  
    // Step statistics
    const stepsStats = {
      total: guide.steps.length,
      completed: guide.steps.filter(step => step.status === 'COMPLETED').length,
      inProgress: guide.steps.filter(step => step.status === 'IN_PROGRESS').length,
      pending: guide.steps.filter(step => step.status === 'PENDING').length
    };
  
    // Time calculations
    let totalEstimatedTime = 0;
    let totalActualTime = 0;
    let completedEstimatedTime = 0;
  
    guide.steps.forEach(step => {
      // Sum up all estimated times
      if (typeof step.estimatedTime === 'number' && step.estimatedTime > 0) {
        totalEstimatedTime += step.estimatedTime;
        
        // For completed steps, also track estimated time separately for progress calculation
        if (step.status === 'COMPLETED') {
          completedEstimatedTime += step.estimatedTime;
        }
      }
      
      // Sum up all actual times
      if (typeof step.actualTime === 'number' && step.actualTime > 0) {
        totalActualTime += step.actualTime;
      } else if (step.workSessions && Array.isArray(step.workSessions)) {
        // If no actualTime but workSessions are available, calculate from them
        const sessionsDuration = step.workSessions.reduce((sum, session) => {
          const duration = session.duration || 0;
          return sum + (duration / 60); // Convert seconds to minutes
        }, 0);
        
        if (sessionsDuration > 0) {
          totalActualTime += sessionsDuration;
        }
      }
    });
  
    // Calculate progress percentage
    let progress = 0;
    if (totalEstimatedTime > 0) {
      // Primary method: Completed steps' estimated time / total estimated time
      if (completedEstimatedTime > 0) {
        progress = (completedEstimatedTime / totalEstimatedTime) * 100;
      } 
      // Alternative: Use ratio of completed steps if all steps have equal weight
      else if (stepsStats.total > 0) {
        progress = (stepsStats.completed / stepsStats.total) * 100;
      }
    }
  
    // Ensure progress is between 0-100
    progress = Math.max(0, Math.min(100, progress));
  
    return {
      steps: stepsStats,
      time: {
        totalEstimatedTime,
        totalActualTime,
        progress
      }
    };
  };
  
  /**
   * Calculate overall statistics for multiple guides
   * @param {Array} guides - Array of production guide objects
   * @returns {Object} Aggregated statistics
   */
  export const calculateOverallStats = (guides) => {
    if (!guides || !Array.isArray(guides)) {
      return {
        totalGuides: 0,
        inProgress: 0,
        completed: 0,
        critical: 0,
        onTime: 0,
        delayed: 0,
        estimatedTotalHours: 0,
        actualTotalHours: 0
      };
    }
  
    const stats = {
      totalGuides: guides.length,
      inProgress: guides.filter(g => g.status === 'IN_PROGRESS').length,
      completed: guides.filter(g => g.status === 'COMPLETED').length,
      critical: guides.filter(g => g.priority === 'CRITICAL').length,
      onTime: 0,
      delayed: 0,
      estimatedTotalHours: 0,
      actualTotalHours: 0
    };
  
    let totalEstimatedMinutes = 0;
    let totalActualMinutes = 0;
  
    guides.forEach(guide => {
      // Sum up time from all guides
      const guideStats = calculateGuideStatistics(guide);
      totalEstimatedMinutes += guideStats.time.totalEstimatedTime;
      totalActualMinutes += guideStats.time.totalActualTime;
  
      // Check if guide is on time or delayed
      if (guide.dueDate) {
        const dueDate = new Date(guide.dueDate);
        const now = new Date();
        
        if (guide.status === 'COMPLETED') {
          // If completed, check completed date against due date
          const completedDate = guide.completedAt ? new Date(guide.completedAt) : now;
          if (completedDate <= dueDate) {
            stats.onTime++;
          } else {
            stats.delayed++;
          }
        } else if (guide.status !== 'CANCELLED' && guide.status !== 'ARCHIVED') {
          // For active guides, check current progress against due date
          if (now > dueDate) {
            stats.delayed++;
          } else {
            // Check if it's likely to be completed on time based on progress
            const timeRemaining = (dueDate - now) / (1000 * 60 * 60 * 24); // days
            const progressPercent = guideStats.time.progress || 0;
            
            // Simple heuristic: if progress percentage is higher than percentage of time passed, it's on track
            if (progressPercent >= (100 - (timeRemaining * 10))) {
              stats.onTime++;
            } else {
              stats.delayed++;
            }
          }
        }
      }
    });
  
    // Convert minutes to hours with 1 decimal place
    stats.estimatedTotalHours = +(totalEstimatedMinutes / 60).toFixed(1);
    stats.actualTotalHours = +(totalActualMinutes / 60).toFixed(1);
  
    return stats;
  };