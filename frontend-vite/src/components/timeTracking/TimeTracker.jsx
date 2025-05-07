// frontend/src/components/timeTracking/TimeTracker.js
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import timeTrackingApi from '../../api/timeTracking.api';

// Funkcja pomocnicza do formatowania czasu jako GG:MM:SS
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
};

const TimeTracker = () => {
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0); // Nowa zmienna stanu dla całkowitego czasu
  const [timer, setTimer] = useState(null);
  const [breakTimer, setBreakTimer] = useState(null);
  const [totalTimer, setTotalTimer] = useState(null); // Timer dla całkowitego czasu
  const [sessionNotes, setSessionNotes] = useState("");
  
  // Pobieranie ustawień śledzenia czasu
  const { data: settings } = useQuery({
    queryKey: ['timeTrackingSettings'],
    queryFn: () => timeTrackingApi.getSettings().then(res => res.data),
  });
  
  // Pobieranie aktualnej sesji
  const { 
    data: currentSession,
    isLoading: sessionLoading,
    refetch: refetchCurrentSession
  } = useQuery({
    queryKey: ['currentSession'],
    queryFn: () => timeTrackingApi.getCurrentSession().then(res => res.data),
    refetchInterval: 60000, // Odświeżanie co minutę
  });
  
  // Obsługa zmian notatek
  const handleNotesChange = (e) => {
    setSessionNotes(e.target.value);
  };
  
  // Mutacje
  const startSessionMutation = useMutation({
    mutationFn: () => timeTrackingApi.startSession({ notes: sessionNotes }),
    onSuccess: () => {
      toast.success('Sesja pracy rozpoczęta');
      setSessionNotes("");
      refetchCurrentSession();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się rozpocząć sesji');
    }
  });
  
  const endSessionMutation = useMutation({
    mutationFn: () => timeTrackingApi.endSession({ notes: sessionNotes }),
    onSuccess: () => {
      toast.success('Sesja pracy zakończona');
      setSessionNotes("");
      queryClient.invalidateQueries({ queryKey: ['currentSession'] });
      queryClient.invalidateQueries({ queryKey: ['userSessions'] });
      queryClient.invalidateQueries({ queryKey: ['dailySummaries'] });
      stopTimer();
      stopBreakTimer();
      stopTotalTimer();
      setElapsedTime(0);
      setBreakTime(0);
      setTotalTime(0);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się zakończyć sesji');
    }
  });
  
  const startBreakMutation = useMutation({
    mutationFn: timeTrackingApi.startBreak,
    onSuccess: () => {
      toast.success('Przerwa rozpoczęta');
      refetchCurrentSession();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się rozpocząć przerwy');
    }
  });
  
  const endBreakMutation = useMutation({
    mutationFn: timeTrackingApi.endBreak,
    onSuccess: () => {
      toast.success('Przerwa zakończona');
      refetchCurrentSession();
      stopBreakTimer();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się zakończyć przerwy');
    }
  });
  
  // Określenie bieżącego stanu
  const isSessionActive = !!currentSession;
  const activeBreak = currentSession?.breaks?.find(b => b.status === 'active');
  const isBreakActive = !!activeBreak;
  const isBreakButtonEnabled = settings?.enableBreakButton ?? true;
  
  // Uruchomienie timera dla czasu pracy
  const startTimer = (initialSeconds = 0) => {
    stopTimer();
    setElapsedTime(initialSeconds);
    
    const newTimer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    setTimer(newTimer);
  };
  
  // Zatrzymanie timera dla czasu pracy
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };
  
  // Uruchomienie timera dla czasu przerwy
  const startBreakTimer = (initialSeconds = 0) => {
    stopBreakTimer();
    setBreakTime(initialSeconds);
    
    const newTimer = setInterval(() => {
      setBreakTime(prev => prev + 1);
    }, 1000);
    
    setBreakTimer(newTimer);
  };
  
  // Zatrzymanie timera dla czasu przerwy
  const stopBreakTimer = () => {
    if (breakTimer) {
      clearInterval(breakTimer);
      setBreakTimer(null);
    }
  };
  
  // Uruchomienie timera dla całkowitego czasu
  const startTotalTimer = (initialSeconds = 0) => {
    stopTotalTimer();
    setTotalTime(initialSeconds);
    
    const newTimer = setInterval(() => {
      setTotalTime(prev => prev + 1);
    }, 1000);
    
    setTotalTimer(newTimer);
  };
  
  // Zatrzymanie timera dla całkowitego czasu
  const stopTotalTimer = () => {
    if (totalTimer) {
      clearInterval(totalTimer);
      setTotalTimer(null);
    }
  };
  
  // Obsługa operacji na sesji
  const handleStartSession = () => {
    startSessionMutation.mutate();
  };
  
  const handleEndSession = () => {
    endSessionMutation.mutate();
  };
  
  const handleStartBreak = () => {
    startBreakMutation.mutate();
  };
  
  const handleEndBreak = () => {
    endBreakMutation.mutate();
  };
  
  // Inicjalizacja timerów po zamontowaniu komponentu lub zmianie sesji
  useEffect(() => {
    if (currentSession) {
      // Ustaw notatki z bieżącej sesji, jeśli dostępne
      if (currentSession.notes) {
        setSessionNotes(currentSession.notes);
      }
      
      const startTime = new Date(currentSession.startTime);
      const now = new Date();
      let initialSeconds = Math.floor((now - startTime) / 1000);
      let totalSeconds = initialSeconds; // Całkowity czas od rozpoczęcia sesji
      
      // Odejmij czas przerw dla obliczenia czasu pracy
      const completedBreaks = currentSession.breaks?.filter(b => b.status === 'completed') || [];
      const totalBreakSeconds = completedBreaks.reduce((total, b) => total + (b.duration || 0), 0);
      initialSeconds -= totalBreakSeconds;
      
      // Uruchom timer
      if (!isBreakActive) {
        startTimer(initialSeconds);
      } else {
        setElapsedTime(initialSeconds);
        stopTimer();
      }
      
      // Sprawdź aktywną przerwę
      if (activeBreak) {
        const breakStartTime = new Date(activeBreak.startTime);
        const breakSeconds = Math.floor((now - breakStartTime) / 1000);
        startBreakTimer(breakSeconds);
      } else {
        stopBreakTimer();
        setBreakTime(totalBreakSeconds);
      }
      
      // Uruchom timer dla całkowitego czasu
      startTotalTimer(totalSeconds);
    } else {
      // Brak aktywnej sesji, zatrzymaj wszystkie timery
      stopTimer();
      stopBreakTimer();
      stopTotalTimer();
      setElapsedTime(0);
      setBreakTime(0);
      setTotalTime(0);
    }
    
    // Czyszczenie timerów przy odmontowaniu
    return () => {
      stopTimer();
      stopBreakTimer();
      stopTotalTimer();
    };
  }, [currentSession, activeBreak, isBreakActive]);
  
  if (sessionLoading) {
    return <div className="text-center py-8">Ładowanie...</div>;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wyświetlanie czasu */}
        <div className="flex flex-col items-center justify-center">
          {isSessionActive && (
            <div className="mb-4">
              <div className="text-5xl font-bold text-indigo-600">{formatTime(totalTime)}</div>
              <div className="text-gray-600 font-medium text-center">Czas całkowity</div>
            </div>
          )}
          
          <div className="text-4xl font-bold mb-2">{formatTime(elapsedTime)}</div>
          <div className="text-gray-600">Czas pracy</div>
          
          {(isSessionActive || breakTime > 0) && isBreakButtonEnabled && (
            <div className="mt-4">
              <div className="text-2xl font-semibold">{formatTime(breakTime)}</div>
              <div className="text-gray-600">Czas przerwy</div>
            </div>
          )}
          
          {/* Notatki do sesji */}
          <div className="mt-4 w-full">
            <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notatki do sesji
            </label>
            <textarea
              id="session-notes"
              value={sessionNotes}
              onChange={handleNotesChange}
              placeholder="Nad czym pracujesz? Dodaj notatki do tej sesji..."
              rows="3"
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
          </div>
        </div>
        
        {/* Przyciski sterujące */}
        <div className="flex flex-col items-center justify-center space-y-4">
          {!isSessionActive && (
            <button
              onClick={handleStartSession}
              disabled={startSessionMutation.isPending}
              className="w-full md:w-48 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg
                hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50
                disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              {startSessionMutation.isPending ? 'Rozpoczynanie...' : 'Rozpocznij pracę'}
            </button>
          )}
          
          {isSessionActive && !isBreakActive && isBreakButtonEnabled && (
            <button
              onClick={handleStartBreak}
              disabled={startBreakMutation.isPending}
              className="w-full md:w-48 px-6 py-3 bg-yellow-500 text-white font-semibold rounded-lg
                hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50
                disabled:bg-yellow-300 disabled:cursor-not-allowed"
            >
              {startBreakMutation.isPending ? 'Rozpoczynanie...' : 'Rozpocznij przerwę'}
            </button>
          )}
          
          {isBreakActive && (
            <button
              onClick={handleEndBreak}
              disabled={endBreakMutation.isPending}
              className="w-full md:w-48 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg
                hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {endBreakMutation.isPending ? 'Kończenie...' : 'Zakończ przerwę'}
            </button>
          )}
          
          {isSessionActive && (
            <button
              onClick={handleEndSession}
              disabled={endSessionMutation.isPending}
              className="w-full md:w-48 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg
                hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
                disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {endSessionMutation.isPending ? 'Kończenie...' : 'Zakończ pracę'}
            </button>
          )}
        </div>
      </div>
      
      {/* Informacje o sesji */}
      {isSessionActive && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <p className="mb-1">
            <span className="font-medium">Sesja rozpoczęta:</span> {new Date(currentSession.startTime).toLocaleString()}
          </p>
          {currentSession.breaks && currentSession.breaks.length > 0 && (
            <p>
              <span className="font-medium">Przerwy:</span> {currentSession.breaks.length} (Łącznie: {formatTime(breakTime)})
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeTracker;