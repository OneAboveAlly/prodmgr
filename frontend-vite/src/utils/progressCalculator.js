/**
 * Utility functions for calculating progress consistently across the application
 */

import productionApi from '../api/production.api';

/**
 * Calculates the progress percentage for a production guide
 * @param {Object} guide - The production guide object
 * @returns {Object} - Progress data with percentComplete, completedSteps, and totalSteps
 */
export const calculateGuideProgress = (guide) => {
  if (!guide || !guide.steps || guide.steps.length === 0) {
    return 0;
  }

  // Jeśli przewodnik jest oznaczony jako zakończony, zwróć 100%
  if (guide.status === 'COMPLETED' || guide.status === 'ARCHIVED') {
    return 100;
  }

  // Jeśli wszystkie etapy są zakończone, zwróć 100%
  const allStepsCompleted = guide.steps.every(step => step.status === 'COMPLETED');
  if (allStepsCompleted && guide.steps.length > 0) {
    return 100;
  }

  // Oblicz postęp na podstawie czasu
  const { totalEstimatedTime, totalActualTime } = getTimeStats(guide);
  
  if (totalEstimatedTime > 0) {
    // Ograniczenie do 100% nawet jeśli rzeczywisty czas przekracza szacowany
    const progressByTime = Math.min(100, Math.round((totalActualTime / totalEstimatedTime) * 100));
    return progressByTime;
  }
  
  // Oblicz postęp na podstawie ukończonych kroków
  const completedSteps = guide.steps.filter(step => step.status === 'COMPLETED').length;
  return Math.round((completedSteps / guide.steps.length) * 100);
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
    const estTime = Number(guide.stats.time.totalEstimatedTime || 0);
    const actTime = Number(guide.stats.time.totalActualTime || 0);
    
    return {
      totalActualTime: isNaN(actTime) ? 0 : actTime,
      totalEstimatedTime: isNaN(estTime) ? 0 : estTime
    };
  }
  
  // Calculate from steps if stats not available
  const totalEstimatedTime = guide.steps.reduce((sum, step) => {
    const estTime = Number(step?.estimatedTime || 0);
    return sum + (isNaN(estTime) ? 0 : estTime);
  }, 0);
  
  const totalActualTime = guide.steps.reduce((sum, step) => {
    const actTime = Number(step?.actualTime || 0);
    return sum + (isNaN(actTime) ? 0 : actTime);
  }, 0);
  
  return { totalActualTime, totalEstimatedTime };
};

/**
 * Sprawdza, czy przewodnik powinien być oznaczony jako zakończony na podstawie postępu
 * i aktualizuje jego status, jeśli to konieczne
 * @param {Object} guide - Przewodnik produkcyjny
 * @param {Function} onSuccess - Funkcja wywołana po pomyślnej aktualizacji (opcjonalnie)
 * @param {Function} onError - Funkcja wywołana w przypadku błędu (opcjonalnie)
 * @returns {Promise<boolean>} - Czy status został zaktualizowany
 */
export const updateGuideStatusIfCompleted = async (guide, onSuccess, onError) => {
  if (!guide || guide.status === 'COMPLETED' || guide.status === 'ARCHIVED') {
    return false;
  }

  const progress = calculateGuideProgress(guide);
  
  // Jeśli postęp wynosi 100%, a status nie jest COMPLETED, zaktualizuj status
  if (progress === 100 && guide.status !== 'COMPLETED') {
    try {
      await productionApi.updateGuide(guide.id, {
        status: 'COMPLETED'
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      return true;
    } catch (error) {
      console.error('Błąd podczas aktualizacji statusu przewodnika:', error);
      
      if (onError) {
        onError(error);
      }
      
      return false;
    }
  }
  
  return false;
};
