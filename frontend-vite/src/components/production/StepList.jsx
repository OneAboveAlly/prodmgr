import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardCheck, Loader2, Hourglass, ChevronDown, ChevronUp, MessageSquareText, Clock, User } from 'lucide-react';
import CommentSection from './CommentSection';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import productionApi from '../../api/production.api';
import { toast } from 'react-toastify';

const StepList = ({ steps, guideId, onAddStepClick }) => {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openStepId, setOpenStepId] = useState(null);

  const canAdd = hasPermission('production', 'update');
  const canManage = hasPermission('production', 'manage');

  // Mutation for updating step status
  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, status }) => {
      const formData = new FormData();
      formData.append('status', status);
      return productionApi.updateStep(stepId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productionGuide', guideId]);
      toast.success('Status kroku zaktualizowany');
    },
    onError: (error) => {
      console.error('Error updating step status:', error);
      toast.error('Błąd aktualizacji statusu kroku');
    }
  });

  const handleStatusChange = (stepId, currentStatus) => {
    let newStatus;
    
    switch (currentStatus) {
      case 'PENDING':
        newStatus = 'IN_PROGRESS';
        break;
      case 'IN_PROGRESS':
        newStatus = 'COMPLETED';
        break;
      case 'COMPLETED':
        newStatus = 'IN_PROGRESS';
        break;
      default:
        newStatus = 'PENDING';
    }
    
    updateStepMutation.mutate({ stepId, status: newStatus });
  };

  const renderStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <ClipboardCheck className="text-green-600 w-5 h-5" />;
      case 'IN_PROGRESS':
        return <Loader2 className="text-yellow-500 w-5 h-5 animate-spin" />;
      case 'PENDING':
      default:
        return <Hourglass className="text-gray-400 w-5 h-5" />;
    }
  };

  const toggleComments = (stepId) => {
    setOpenStepId(prev => (prev === stepId ? null : stepId));
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Kroki produkcyjne</h3>
        {canAdd && (
          <button
            onClick={onAddStepClick}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
          >
            <Plus size={16} /> Dodaj krok
          </button>
        )}
      </div>

      {steps.length === 0 ? (
        <div className="bg-gray-50 p-8 text-center rounded-lg border border-gray-200">
          <p className="text-gray-500 italic mb-4">Brak kroków w tym przewodniku.</p>
          {canAdd && (
            <button
              onClick={onAddStepClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
            >
              <Plus size={18} /> Dodaj pierwszy krok
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {steps.map((step, index) => (
            <li key={step.id} className="py-3">
              <div className="flex items-start justify-between px-2 hover:bg-gray-50 rounded transition">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="bg-indigo-100 text-indigo-800 w-6 h-6 flex items-center justify-center rounded-full mr-2">
                      {index + 1}
                    </span>
                    <p className="font-medium text-gray-800">
                      {step.title}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{step.description || 'Brak opisu'}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    {step.estimatedTime && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock size={14} />
                        <span>Czas: {step.estimatedTime} min</span>
                      </div>
                    )}
                    {step.assignedToRole && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <User size={14} />
                        <span>Rola: {step.assignedToRole}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => canManage && handleStatusChange(step.id, step.status)}
                    className={`flex items-center gap-1 px-2 py-1 rounded ${
                      canManage ? 'hover:bg-gray-200 cursor-pointer' : ''
                    }`}
                    disabled={!canManage || updateStepMutation.isLoading}
                    title={canManage ? "Zmień status" : "Brak uprawnień do zmiany statusu"}
                  >
                    {renderStatusIcon(step.status)}
                    <span className="text-xs font-medium hidden sm:inline">
                      {step.status}
                    </span>
                  </button>
                  <button
                    onClick={() => toggleComments(step.id)}
                    className="text-gray-600 hover:text-indigo-600 transition"
                    title="Pokaż komentarze"
                  >
                    <MessageSquareText size={18} />
                  </button>
                </div>
              </div>

              {/* Rozwijana sekcja komentarzy */}
              {openStepId === step.id && (
                <div className="mt-2 px-4 py-2 border-l-4 border-indigo-400 bg-gray-50 rounded-lg">
                  <CommentSection stepId={step.id} guideId={guideId} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StepList;