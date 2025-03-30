// frontend/src/components/timeTracking/TimeTracker.js
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import timeTrackingApi from '../../api/timeTracking.api';

// Helper function to format time as HH:MM:SS
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
  
  // Fetch time tracking settings
  const { data: settings } = useQuery({
    queryKey: ['timeTrackingSettings'],
    queryFn: () => timeTrackingApi.getSettings().then(res => res.data),
  });
  
  // Fetch current session
  const { 
    data: currentSession,
    isLoading: sessionLoading,
    refetch: refetchCurrentSession
  } = useQuery({
    queryKey: ['currentSession'],
    queryFn: () => timeTrackingApi.getCurrentSession().then(res => res.data),
    refetchInterval: 60000, // Refetch every minute
  });
  
  // Handle notes changes
  const handleNotesChange = (e) => {
    setSessionNotes(e.target.value);
  };
  
  // Mutations
  const startSessionMutation = useMutation({
    mutationFn: () => timeTrackingApi.startSession({ notes: sessionNotes }),
    onSuccess: () => {
      toast.success('Work session started');
      setSessionNotes("");
      refetchCurrentSession();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to start session');
    }
  });
  
  const endSessionMutation = useMutation({
    mutationFn: () => timeTrackingApi.endSession({ notes: sessionNotes }),
    onSuccess: () => {
      toast.success('Work session ended');
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
      toast.error(error.response?.data?.message || 'Failed to end session');
    }
  });
  
  const startBreakMutation = useMutation({
    mutationFn: timeTrackingApi.startBreak,
    onSuccess: () => {
      toast.success('Break started');
      refetchCurrentSession();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to start break');
    }
  });
  
  const endBreakMutation = useMutation({
    mutationFn: timeTrackingApi.endBreak,
    onSuccess: () => {
      toast.success('Break ended');
      refetchCurrentSession();
      stopBreakTimer();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to end break');
    }
  });
  
  // Determine current state
  const isSessionActive = !!currentSession;
  const activeBreak = currentSession?.breaks?.find(b => b.status === 'active');
  const isBreakActive = !!activeBreak;
  const isBreakButtonEnabled = settings?.enableBreakButton ?? true;
  
  // Start timer for work time
  const startTimer = (initialSeconds = 0) => {
    stopTimer();
    setElapsedTime(initialSeconds);
    
    const newTimer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    setTimer(newTimer);
  };
  
  // Stop timer for work time
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };
  
  // Start timer for break time
  const startBreakTimer = (initialSeconds = 0) => {
    stopBreakTimer();
    setBreakTime(initialSeconds);
    
    const newTimer = setInterval(() => {
      setBreakTime(prev => prev + 1);
    }, 1000);
    
    setBreakTimer(newTimer);
  };
  
  // Stop timer for break time
  const stopBreakTimer = () => {
    if (breakTimer) {
      clearInterval(breakTimer);
      setBreakTimer(null);
    }
  };
  
  // Start timer for total time
  const startTotalTimer = (initialSeconds = 0) => {
    stopTotalTimer();
    setTotalTime(initialSeconds);
    
    const newTimer = setInterval(() => {
      setTotalTime(prev => prev + 1);
    }, 1000);
    
    setTotalTimer(newTimer);
  };
  
  // Stop timer for total time
  const stopTotalTimer = () => {
    if (totalTimer) {
      clearInterval(totalTimer);
      setTotalTimer(null);
    }
  };
  
  // Handle session operations
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
  
  // Initialize timers when component mounts or session changes
  useEffect(() => {
    if (currentSession) {
      // Set notes from current session if available
      if (currentSession.notes) {
        setSessionNotes(currentSession.notes);
      }
      
      const startTime = new Date(currentSession.startTime);
      const now = new Date();
      let initialSeconds = Math.floor((now - startTime) / 1000);
      let totalSeconds = initialSeconds; // Całkowity czas od rozpoczęcia sesji
      
      // Subtract break times for work time calculation
      const completedBreaks = currentSession.breaks?.filter(b => b.status === 'completed') || [];
      const totalBreakSeconds = completedBreaks.reduce((total, b) => total + (b.duration || 0), 0);
      initialSeconds -= totalBreakSeconds;
      
      // Start the timer
      if (!isBreakActive) {
        startTimer(initialSeconds);
      } else {
        setElapsedTime(initialSeconds);
        stopTimer();
      }
      
      // Check for active break
      if (activeBreak) {
        const breakStartTime = new Date(activeBreak.startTime);
        const breakSeconds = Math.floor((now - breakStartTime) / 1000);
        startBreakTimer(breakSeconds);
      } else {
        stopBreakTimer();
        setBreakTime(totalBreakSeconds);
      }
      
      // Start total time timer
      startTotalTimer(totalSeconds);
    } else {
      // No active session, stop all timers
      stopTimer();
      stopBreakTimer();
      stopTotalTimer();
      setElapsedTime(0);
      setBreakTime(0);
      setTotalTime(0);
    }
    
    // Cleanup timers on unmount
    return () => {
      stopTimer();
      stopBreakTimer();
      stopTotalTimer();
    };
  }, [currentSession, activeBreak, isBreakActive]);
  
  if (sessionLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Timer Display */}
        <div className="flex flex-col items-center justify-center">
          {isSessionActive && (
            <div className="mb-4">
              <div className="text-5xl font-bold text-indigo-600">{formatTime(totalTime)}</div>
              <div className="text-gray-600 font-medium text-center">Total Time</div>
            </div>
          )}
          
          <div className="text-4xl font-bold mb-2">{formatTime(elapsedTime)}</div>
          <div className="text-gray-600">Work Time</div>
          
          {(isSessionActive || breakTime > 0) && isBreakButtonEnabled && (
            <div className="mt-4">
              <div className="text-2xl font-semibold">{formatTime(breakTime)}</div>
              <div className="text-gray-600">Break Time</div>
            </div>
          )}
          
          {/* Session Notes */}
          <div className="mt-4 w-full">
            <label htmlFor="session-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Session Notes
            </label>
            <textarea
              id="session-notes"
              value={sessionNotes}
              onChange={handleNotesChange}
              placeholder="What are you working on? Add notes for this session..."
              rows="3"
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex flex-col items-center justify-center space-y-4">
          {!isSessionActive && (
            <button
              onClick={handleStartSession}
              disabled={startSessionMutation.isPending}
              className="w-full md:w-48 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg
                hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50
                disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              {startSessionMutation.isPending ? 'Starting...' : 'Start Work'}
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
              {startBreakMutation.isPending ? 'Starting...' : 'Start Break'}
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
              {endBreakMutation.isPending ? 'Ending...' : 'End Break'}
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
              {endSessionMutation.isPending ? 'Ending...' : 'End Work'}
            </button>
          )}
        </div>
      </div>
      
      {/* Session Info */}
      {isSessionActive && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <p className="mb-1">
            <span className="font-medium">Session started:</span> {new Date(currentSession.startTime).toLocaleString()}
          </p>
          {currentSession.breaks && currentSession.breaks.length > 0 && (
            <p>
              <span className="font-medium">Breaks:</span> {currentSession.breaks.length} (Total: {formatTime(breakTime)})
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TimeTracker;