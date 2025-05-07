import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import StatusBadge from './StatusBadge';
import productionApi from '../../api/production.api';

// Import bibliotek do obsługi drag-and-drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// Komponent dla pojedynczego kroku, który można przeciągać
const SortableStep = ({ step, hasPermission, openEditStepForm, handleStepDelete, setSelectedStep, setShowStepAssignModal }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" {...attributes} {...listeners}>
        {step.order}
        {/* Ikona uchwytu do przeciągania */}
        <svg className="w-4 h-4 ml-1 text-gray-400 cursor-move inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">
          <Link to={`/production/steps/${step.id}`} className="hover:text-indigo-600">
            {step.title}
          </Link>
        </div>
        {step.description && (
          <div className="text-sm text-gray-500 line-clamp-1">
            {step.description}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={step.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {step.estimatedTime ? `${step.estimatedTime} min` : '-'}
      </td>
      {hasPermission('production', 'update') && (
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => {
              setSelectedStep(step);
              setShowStepAssignModal(true);
            }}
            className="text-indigo-600 hover:text-indigo-900 mr-3"
            title="Przypisz użytkowników"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 100-6 3 3 0 000 6zm8 8a3 3 0 100-6 3 3 0 000 6zm-4-7a1 1 0 10-2 0v1H9a1 1 0 100 2h2v1a1 1 0 102 0v-1h2a1 1 0 100-2h-2V7z" />
            </svg>
          </button>
          <button
            onClick={() => openEditStepForm(step)}
            className="text-indigo-600 hover:text-indigo-900 mr-3"
          >
            Edytuj
          </button>
          <button
            onClick={() => handleStepDelete(step.id)}
            className="text-red-600 hover:text-red-900"
          >
            Usuń
          </button>
        </td>
      )}
    </tr>
  );
};

const DraggableStepList = ({ 
  steps, 
  guideId, 
  hasPermission, 
  openEditStepForm, 
  handleStepDelete, 
  setSelectedStep, 
  setShowStepAssignModal 
}) => {
  const queryClient = useQueryClient();
  
  // Mutation do aktualizacji kolejności kroków
  const updateStepOrderMutation = useMutation({
    mutationFn: async ({ stepId, newOrder }) => {
      return productionApi.updateStep(stepId, { order: newOrder });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['guide', guideId]);
    },
    onError: (error) => {
      toast.error(`Błąd aktualizacji kolejności kroków: ${error.message}`);
    }
  });

  // Funkcja obsługująca zmianę kolejności kroków
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const stepsArray = [...steps];
      const oldIndex = stepsArray.findIndex(step => step.id === active.id);
      const newIndex = stepsArray.findIndex(step => step.id === over.id);
      
      // Przelicz nową kolejność - przypisz nową wartość order dla przeciągniętego elementu
      const reorderedSteps = arrayMove(stepsArray, oldIndex, newIndex);
      
      // Aktualizujemy kolejność wszystkich kroków
      reorderedSteps.forEach((step, index) => {
        // Jeśli kolejność się zmieniła, aktualizujemy ją w bazie danych
        if (step.order !== index + 1) {
          updateStepOrderMutation.mutate({ 
            stepId: step.id, 
            newOrder: index + 1 
          });
        }
      });
      
      // Natychmiast aktualizuj lokalny stan, aby UI odpowiadało na zmianę
      queryClient.setQueryData(['guide', guideId], old => {
        if (!old) return old;
        return {
          ...old,
          steps: reorderedSteps.map((step, index) => ({
            ...step,
            order: index + 1
          }))
        };
      });
    }
  };

  // Konfiguracja sensorów dla DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimalna odległość potrzebna do rozpoczęcia przeciągania
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  Kolejność
                  {hasPermission('production', 'update') && (
                    <span className="ml-2 text-xs text-gray-400">(przeciągnij, aby zmienić)</span>
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Tytuł
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Szac. czas
              </th>
              {hasPermission('production', 'update') && (
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Akcje
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <SortableContext
              items={steps.map(step => step.id)}
              strategy={verticalListSortingStrategy}
            >
              {steps.map((step) => (
                <SortableStep
                  key={step.id}
                  step={step}
                  hasPermission={hasPermission}
                  openEditStepForm={openEditStepForm}
                  handleStepDelete={handleStepDelete}
                  setSelectedStep={setSelectedStep}
                  setShowStepAssignModal={setShowStepAssignModal}
                />
              ))}
            </SortableContext>
          </tbody>
        </table>
      </DndContext>
    </div>
  );
};

export default DraggableStepList; 