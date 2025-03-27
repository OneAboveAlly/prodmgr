// frontend/src/pages/TimeTrackingSettingsPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import timeTrackingApi from '../api/timeTracking.api';
import { useAuth } from '../contexts/AuthContext';

const TimeTrackingSettingsPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Check permission and redirect if needed
  useEffect(() => {
    if (!hasPermission('timeTracking', 'manageSettings')) {
      navigate('/time-tracking');
    }
  }, [hasPermission, navigate]);
  
  // Setup form state
  const [formData, setFormData] = useState({
    enableBreakButton: true,
    minSessionDuration: 0,
    maxSessionDuration: 720,
    maxBreakDuration: 60
  });
  
  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['timeTrackingSettings'],
    queryFn: () => timeTrackingApi.getSettings().then(res => res.data),
  });
  
  // Update form state when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        enableBreakButton: settings.enableBreakButton,
        minSessionDuration: settings.minSessionDuration,
        maxSessionDuration: settings.maxSessionDuration,
        maxBreakDuration: settings.maxBreakDuration
      });
    }
  }, [settings]);
  
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data) => timeTrackingApi.updateSettings(data),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['timeTrackingSettings'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    }
  });
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };
  
  // Handle cancel button
  const handleCancel = () => {
    navigate('/time-tracking');
  };
  
  // If the user doesn't have the required permission, we don't render anything
  // The useEffect above will handle the redirect
  if (!hasPermission('timeTracking', 'manageSettings')) {
    return null;
  }
  
  if (isLoading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Time Tracking Settings</h1>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Break Button Setting */}
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableBreakButton"
                  name="enableBreakButton"
                  checked={formData.enableBreakButton}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="enableBreakButton" className="ml-2 block text-sm font-medium text-gray-700">
                  Enable Break Button
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                When enabled, users can track breaks separately from work time.
              </p>
            </div>
            
            {/* Duration Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="minSessionDuration" className="block text-sm font-medium text-gray-700">
                  Minimum Session Duration (minutes)
                </label>
                <input
                  type="number"
                  id="minSessionDuration"
                  name="minSessionDuration"
                  value={formData.minSessionDuration}
                  onChange={handleChange}
                  min="0"
                  max="60"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum required time for a session to be valid (0 = no minimum)
                </p>
              </div>
              
              <div>
                <label htmlFor="maxSessionDuration" className="block text-sm font-medium text-gray-700">
                  Maximum Session Duration (minutes)
                </label>
                <input
                  type="number"
                  id="maxSessionDuration"
                  name="maxSessionDuration"
                  value={formData.maxSessionDuration}
                  onChange={handleChange}
                  min="60"
                  max="1440"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum allowed time for a single work session (default = 12 hours)
                </p>
              </div>
            </div>
            
            {/* Break Duration Settings */}
            {formData.enableBreakButton && (
              <div>
                <label htmlFor="maxBreakDuration" className="block text-sm font-medium text-gray-700">
                  Maximum Break Duration (minutes)
                </label>
                <input
                  type="number"
                  id="maxBreakDuration"
                  name="maxBreakDuration"
                  value={formData.maxBreakDuration}
                  onChange={handleChange}
                  min="5"
                  max="240"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum allowed time for a single break (default = 1 hour)
                </p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TimeTrackingSettingsPage;