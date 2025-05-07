// frontend-vite/src/pages/ProductionGuideDetailsPage.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import productionApi from '../api/production.api';
import { useSocket } from '../contexts/SocketContext';
import PriorityBadge from '../components/production/PriorityBadge';
import StatusBadge from '../components/production/StatusBadge';
import AttachmentsViewer from '../components/production/AttachmentsViewer';
import WorkTimeHistory from '../components/production/WorkTimeHistory';
import ProgressBar from '../components/production/ProgressBar';
import GuideInventorySection from '../components/inventory/GuideInventorySection';
import DraggableStepList from '../components/production/DraggableStepList';
// Import bibliotek do obsługi drag-and-drop
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ChevronLeftIcon, 
  PencilIcon, 
  ArchiveBoxIcon, 
  ArrowUpTrayIcon,
  TrashIcon,
  ArrowPathIcon,
  UserIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import Modal from '../components/common/Modal';

// Step Assignment Modal Component
const StepAssignmentModal = ({ step, isOpen, onClose }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Fetch current step assignments when modal opens
  useEffect(() => {
    if (isOpen && step) {
      setIsLoading(true);
      // Get current assigned users for this step
      productionApi.getStepAssignedUsers(step.id)
        .then(users => {
          setSelectedUsers(users.map(u => u.id));
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error loading step users:', err);
          setIsLoading(false);
        });
    }
  }, [isOpen, step]);

  // Fetch all users for selection
  const { data: usersData } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: () => productionApi.getAllUsers({ search: searchTerm }),
    enabled: isOpen,
  });

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
  };

  const handleSave = () => {
    if (!step) return;

    productionApi.assignUsersToStep(step.id, selectedUsers)
      .then(() => {
        toast.success('Użytkownicy przypisani do kroku pomyślnie');
        onClose();
        queryClient.refetchQueries(['guide', step.guideId]);
      })
      .catch(err => {
        toast.error(`Błąd przypisywania użytkowników do kroku: ${err.message}`);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Przypisz użytkowników do kroku: {step?.title}</h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Szukaj użytkowników..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-4">Ładowanie użytkowników...</div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded mb-4">
            {usersData?.users?.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {usersData.users.map(user => (
                  <li key={user.id} className="p-2 hover:bg-gray-100">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                        className="h-4 w-4 text-indigo-600"
                      />
                      <span>{user.firstName} {user.lastName}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-center">Nie znaleziono użytkowników</p>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Zapisz przypisania
          </button>
        </div>
      </div>
    </div>
  );
};

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

const ProductionGuideDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  
  // Flag to track if we're viewing from archive
  const isFromArchive = location.state?.from === 'archive';

  // States
  const [showStepForm, setShowStepForm] = useState(false);
  const [showAssignUsers, setShowAssignUsers] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [stepFormData, setStepFormData] = useState({
    title: '',
    description: '',
    estimatedTime: 0,
    order: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [showStepAssignModal, setShowStepAssignModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const archiveReasonRef = useRef(null);
  
  // Nowy stan dla modalu zapisu szablonu
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  // Nowe stany dla filtrów kroków
  const [stepFilters, setStepFilters] = useState({
    status: '',
    assignedUser: '',
    searchText: '',
    showOnlyMySteps: false
  });

  // Fetch guide details
  const { 
    data: guide, 
    isLoading, 
    isError, 
    error,
    refetch,
    isRefetching,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['guide', id],
    queryFn: async () => {
      try {
        console.log("Fetching guide with ID:", id);
        const result = await productionApi.getGuideById(id, {
          includeSteps: true,
          includeStats: true,
          includeTimeData: true,
          complete: true
        });
        console.log("Guide fetch result:", result);
        
        // Check if the API returned an error object
        if (result && result.error === true) {
          // Convert API error objects to thrown errors for consistent handling
          throw new Error(result.message || "Failed to fetch guide");
        }
        
        return result;
      } catch (err) {
        console.error("Error fetching guide:", err);
        throw err;
      }
    },
    refetchOnMount: true,
    refetchInterval: 10000, // Odświeżaj dane co 10 sekund
    refetchIntervalInBackground: false, // Nie odświeżaj gdy karta jest nieaktywna
    onSuccess: (data, variables, context) => {
      console.log("Guide loaded successfully:", data);
      
      // Skip status updates if viewing from archive
      if (isFromArchive && data.guide && data.guide.status !== 'ARCHIVED') {
        console.log("Guide viewed from archive is no longer archived. Showing notification.");
        toast.info('Status przewodnika zaktualizowany do "Zakończony"');
        return;
      }
      
      // Display toast notification when data is refreshed, but not on initial load
      if (context?.dataUpdatedAt && dataUpdatedAt !== context.dataUpdatedAt) {
        // Check if something significant changed to show a more specific message
        const previousData = queryClient.getQueryData(['guide', id]);
        
        if (previousData && previousData.guide) {
          // Check for status change
          if (previousData.guide.status !== data.guide.status) {
            toast.info(`Status zaktualizowany: ${data.guide.status.replace('_', ' ')}`);
          } 
          // Check for step completion changes
          else if (previousData.guide.steps && data.guide.steps) {
            const prevCompleted = previousData.guide.steps.filter(s => s.status === 'COMPLETED').length;
            const newCompleted = data.guide.steps.filter(s => s.status === 'COMPLETED').length;
            
            if (newCompleted > prevCompleted) {
              toast.success(`Nowe etapy ukończone: ${newCompleted}/${data.guide.steps.length}`);
            }
          }
          // Default refresh message
          else {
            toast.info('Dane przewodnika zostały zaktualizowane', {
              autoClose: 2000,
              hideProgressBar: true,
              position: 'bottom-right'
            });
          }
        }
      }
    },
    onError: (error) => {
      console.error("Error loading guide:", error);
      toast.error(`Error loading guide: ${error.message}`);
    }
  });

  // Check if we actually have a guide with a title or other required fields
  // This handles cases where the API returns a non-null object but it's not a valid guide
  const isValidGuide = guide && (guide.title || (guide.guide && guide.guide.title));

  // Use nullable guide if API returns nested structure
  const guideData = guide?.guide || (isValidGuide ? guide : null);
  const statsData = guide?.stats || {};

  // Format data correctly for ProgressBar component
  const processedGuideData = useMemo(() => {
    if (!guide) return null;
    
    return {
      ...guide,
      steps: guide.steps || [],
      stats: statsData
    };
  }, [guide, statsData]);

  // Fetch users for user assignment
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: () => productionApi.getAllUsers({ search: searchTerm }),
    enabled: showAssignUsers,
    onError: (error) => {
      toast.error(`Error loading users: ${error.message}`);
    }
  });

  // Mutations
  const addStepMutation = useMutation({
    mutationFn: ({ guideId, formData }) => productionApi.addStep(guideId, formData),
    onSuccess: () => {
      toast.success('Step added successfully!');
      queryClient.refetchQueries(['guide', id]);
      resetStepForm();
    },
    onError: (error) => {
      toast.error(`Error adding step: ${error.message}`);
    }
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, formData }) => productionApi.updateStep(stepId, formData),
    onSuccess: () => {
      toast.success('Step updated successfully!');
      queryClient.refetchQueries(['guide', id]);
      resetStepForm();
    },
    onError: (error) => {
      toast.error(`Error updating step: ${error.message}`);
    }
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId) => productionApi.deleteStep(stepId),
    onSuccess: () => {
      toast.success('Step deleted successfully!');
      queryClient.refetchQueries(['guide', id]);
    },
    onError: (error) => {
      toast.error(`Error deleting step: ${error.message}`);
    }
  });

  const deleteGuideMutation = useMutation({
    mutationFn: (guideId) => productionApi.deleteGuide(guideId),
    onSuccess: () => {
      toast.success('Production guide deleted successfully!');
      navigate('/production');
    },
    onError: (error) => {
      console.error('Delete guide error:', error);
      toast.error(error.message || 'Error deleting guide');
    }
  });

  const handleGuideDelete = () => {
    if (window.confirm('Are you sure you want to delete this production guide? This action cannot be undone.')) {
      console.log('Initiating delete for guide:', id);
      
      const isAdmin = user.roles && user.roles.some(role => 
        role.name === 'Admin' || role.name === 'Administrator'
      );
      
      if (isAdmin) {
        console.log('User has admin role - should be able to delete');
      } else {
        console.log('User does not have admin role - checking production.delete permission');
        const deletePermLevel = user.permissions?.['production.delete'] || 0;
        console.log('User permission level for production.delete:', deletePermLevel);
      }
      
      deleteGuideMutation.mutate(id);
    }
  };

  const assignUsersMutation = useMutation({
    mutationFn: (data) => productionApi.assignUsers(data.guideId, data.userIds),
    onSuccess: () => {
      toast.success('Users assigned successfully!');
      setShowAssignUsers(false);
      queryClient.refetchQueries(['guide', id]);
    },
    onError: (error) => {
      toast.error(`Error assigning users: ${error.message}`);
    }
  });

  // Add a new mutation for removing users
  const removeUserMutation = useMutation({
    mutationFn: (userId) => productionApi.removeUser(id, userId),
    onSuccess: () => {
      toast.success('User removed successfully!');
      queryClient.refetchQueries(['guide', id]);
    },
    onError: (error) => {
      toast.error(`Error removing user: ${error.message}`);
    }
  });

  // Add handler for removing users
  const handleRemoveUser = (userId, userName) => {
    if (window.confirm(`Are you sure you want to remove ${userName} from this guide?`)) {
      removeUserMutation.mutate(userId);
    }
  };

  // Initialize form data when guide is loaded or steps change
  useEffect(() => {
    if (guideData) {
      setStepFormData(prev => ({
        ...prev,
        order: guideData.steps?.length ? Math.max(...guideData.steps.map(step => step.order)) + 1 : 1
      }));
    }
  }, [guideData]);

  // Step form handlers
  const resetStepForm = () => {
    setStepFormData({
      title: '',
      description: '',
      estimatedTime: 0,
      order: guideData?.steps?.length ? Math.max(...guideData.steps.map(step => step.order)) + 1 : 1
    });
    setEditingStep(null);
    setShowStepForm(false);
  };

  const handleStepFormChange = (e) => {
    const { name, value } = e.target;
    setStepFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedTime' || name === 'order' ? Number(value) : value
    }));
  };

  const openStepForm = () => {
    resetStepForm();
    setShowStepForm(true);
  };

  const openEditStepForm = (step) => {
    setStepFormData({
      title: step.title,
      description: step.description || '',
      estimatedTime: step.estimatedTime || 0,
      order: step.order
    });
    setEditingStep(step.id);
    setShowStepForm(true);
  };

  const handleStepSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', stepFormData.title);
    formData.append('description', stepFormData.description || '');
    formData.append('estimatedTime', stepFormData.estimatedTime);
    formData.append('order', stepFormData.order);

    if (editingStep) {
      // Check if we need to update the status based on time changes
      const currentStep = guideData.steps.find(step => step.id === editingStep);
      
      if (currentStep && currentStep.actualTime) {
        // Case 1: If the step was completed but now needs more time
        if (currentStep.status === 'COMPLETED' && 
            parseInt(stepFormData.estimatedTime) > currentStep.actualTime) {
          formData.append('status', 'IN_PROGRESS');
          toast.info('Step status changed to In Progress due to increased time estimate.');
        } 
        // Case 2: If step was in progress but now the time matches
        else if (currentStep.status === 'IN_PROGRESS' && 
                 parseInt(stepFormData.estimatedTime) <= currentStep.actualTime) {
          formData.append('status', 'COMPLETED');
          toast.info('Step status changed to Completed as the estimated time now matches or is less than the actual time worked.');
        }
      }
      
      updateStepMutation.mutate({ stepId: editingStep, formData });
    } else {
      addStepMutation.mutate({ guideId: id, formData });
    }
  };

  const handleStepDelete = (stepId) => {
    if (window.confirm('Are you sure you want to delete this step?')) {
      deleteStepMutation.mutate(stepId);
    }
  };

  // User assignment handlers
  const handleToggleAssignUsers = () => {
    if (!showAssignUsers && guideData) {
      const currentAssignedUsers = guideData.assignedUsers?.map(a => a.userId) || [];
      setSelectedUsers(currentAssignedUsers);
    }
    setShowAssignUsers(!showAssignUsers);
    setSearchTerm('');
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleAssignUsers = () => {
    assignUsersMutation.mutate({
      guideId: id,
      userIds: selectedUsers
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Funkcja zwracająca posortowane kroki
  const getSortedSteps = () => {
    if (!guideData?.steps) return [];
    return [...guideData.steps].sort((a, b) => a.order - b.order);
  };
  
  // Funkcja filtrująca kroki na podstawie wybranych filtrów
  const getFilteredSteps = () => {
    let filteredSteps = getSortedSteps();
    
    // Filtrowanie po statusie
    if (stepFilters.status) {
      filteredSteps = filteredSteps.filter(step => step.status === stepFilters.status);
    }
    
    // Filtrowanie po przypisanych użytkownikach
    if (stepFilters.assignedUser) {
      filteredSteps = filteredSteps.filter(step => 
        step.assignedUsers?.some(assignment => 
          assignment.userId === stepFilters.assignedUser
        )
      );
    }
    
    // Filtrowanie po tekście (tytuł lub opis)
    if (stepFilters.searchText) {
      const searchLower = stepFilters.searchText.toLowerCase();
      filteredSteps = filteredSteps.filter(step => 
        step.title.toLowerCase().includes(searchLower) || 
        (step.description && step.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Filtrowanie tylko moich kroków
    if (stepFilters.showOnlyMySteps && user?.id) {
      filteredSteps = filteredSteps.filter(step => 
        step.assignedUsers?.some(assignment => 
          assignment.userId === user.id
        )
      );
    }
    
    return filteredSteps;
  };
  
  // Obsługa zmiany filtrów kroków
  const handleStepFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStepFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Resetowanie filtrów kroków
  const resetStepFilters = () => {
    setStepFilters({
      status: '',
      assignedUser: '',
      searchText: '',
      showOnlyMySteps: false
    });
  };

  // Funkcja do formatowania daty
  const formatDate = (date) => {
    if (!date) return 'No deadline set';
    return new Date(date).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render guide inventory section
  const renderInventorySection = () => {
    if (!guideData) return null;
    
    // Sprawdź, czy użytkownik jest przypisany do przewodnika
    const isUserAssigned = guideData.assignedUsers?.some(assignment => 
      assignment.userId === user?.id
    );
    
    const canEdit = hasPermission('production', 'update');
    
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Przedmioty przypisane do przewodnika</h2>
          
          {!isUserAssigned && (
            <div className="text-sm text-yellow-600 bg-yellow-50 px-4 py-1 rounded-md">
              Musisz być przypisany do przewodnika, aby pobierać przedmioty
            </div>
          )}
        </div>
        
        <GuideInventorySection 
          guideId={id} 
          isUserAssigned={isUserAssigned} 
          canEdit={canEdit} 
        />
      </div>
    );
  };

  // Display friendly error messages
  useEffect(() => {
    if (isError && error) {
      // Display a more user-friendly error message if available
      const message = error.displayMessage || error.message || 'An error occurred while loading the guide';
      toast.error(message);
    }
  }, [isError, error]);

  // Setup socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !id) return;
    
    // Listen for guide updates
    socket.on(`guide:${id}:updated`, (updatedGuide) => {
      console.log('Real-time guide update received:', updatedGuide);
      
      // Update the guide data in the cache
      queryClient.setQueryData(['guide', id], (oldData) => {
        if (!oldData) return updatedGuide;
        return { ...oldData, guide: updatedGuide };
      });
      
      toast.info('Przewodnik został zaktualizowany przez innego użytkownika', {
        autoClose: 3000,
        position: 'bottom-right'
      });
    });
    
    // Listen for step status changes
    socket.on(`guide:${id}:step-updated`, (stepData) => {
      console.log('Step update received:', stepData);
      
      // Update only the specific step in the cache
      queryClient.setQueryData(['guide', id], (oldData) => {
        if (!oldData || !oldData.guide || !oldData.guide.steps) return oldData;
        
        const updatedSteps = oldData.guide.steps.map(step => 
          step.id === stepData.id ? { ...step, ...stepData } : step
        );
        
        return {
          ...oldData,
          guide: {
            ...oldData.guide,
            steps: updatedSteps
          }
        };
      });
      
      toast.info(`Krok "${stepData.title}" został zaktualizowany`, {
        autoClose: 3000,
        position: 'bottom-right'
      });
    });
    
    // Listen for new comments
    socket.on(`guide:${id}:new-comment`, (commentData) => {
      console.log('New comment received:', commentData);
      toast.info(`Nowy komentarz od ${commentData.user.firstName}`, {
        autoClose: 3000,
        position: 'bottom-right'
      });
      
      // Optionally invalidate comments query to trigger refetch
      queryClient.invalidateQueries(['comments', id]);
    });
    
    return () => {
      socket.off(`guide:${id}:updated`);
      socket.off(`guide:${id}:step-updated`);
      socket.off(`guide:${id}:new-comment`);
    };
  }, [socket, id, queryClient]);

  // Obsługa zapisu szablonu
  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Wprowadź nazwę dla szablonu');
      return;
    }
    
    toast.info('Zapisywanie przewodnika jako szablon...');
    productionApi.saveGuideAsTemplate(id, { 
      title: templateName,
      description: `Szablon utworzony z przewodnika: ${guideData.title}`
    })
      .then((response) => {
        console.log('Template created:', response);
        toast.success('Przewodnik zapisany jako szablon pomyślnie');
        setShowSaveTemplateModal(false);
      })
      .catch(err => {
        console.error('Template creation error:', err);
        const errorMessage = 
          err.response?.data?.message || 
          err.message || 
          'Unknown error';
        toast.error(`Błąd tworzenia szablonu: ${errorMessage}`);
      });
  };

  // Otwarcie modalu zapisu szablonu
  const openSaveTemplateModal = () => {
    setTemplateName(`${guideData.title} Szablon`);
    setShowSaveTemplateModal(true);
  };

  // If loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading guide details...</p>
        </div>
      </div>
    );
  }

  // If error, show an error message
  if (isError) {
    console.error('Error loading guide:', error);
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Error Loading Guide</h2>
          <p className="text-gray-600 mb-4">{error.message || 'An unexpected error occurred'}</p>
          <button 
            onClick={() => refetch()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Make sure we have a valid guide with data
  if (!isValidGuide) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="text-center">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Guide Not Found</h2>
          <p className="text-gray-600 mb-4">The requested guide could not be found or has been deleted.</p>
          <Link
            to="/production"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Powrót do przewodników
          </Link>
        </div>
      </div>
    );
  }

  // Handle guide archive
  const handleArchiveGuide = () => {
    if (!archiveReason.trim()) {
      toast.error('Proszę podać powód archiwizacji');
      if (archiveReasonRef.current) {
        archiveReasonRef.current.focus();
      }
      return;
    }
    
    toast.info('Archiwizacja przewodnika...');
    productionApi.archiveGuide(id, { reason: archiveReason })
      .then((response) => {
        console.log('Archive response:', response);
        toast.success('Przewodnik zarchiwizowany pomyślnie');
        setShowArchiveModal(false);
        navigate('/production');
      })
      .catch(err => {
        console.error('Archive error details:', err);
        const errorMessage = 
          err.response?.data?.message || 
          err.message || 
          'Unknown error';
        toast.error(`Błąd archiwizacji przewodnika: ${errorMessage}. Proszę spróbować ponownie później.`);
      });
  };

  // Main content render
  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Main content */}
        <div className="flex flex-col w-full mb-6">
          <div className="w-full mb-4 flex justify-between items-center">
            <div className="flex items-center">
              <Link
                to={isFromArchive ? "/production/archive" : "/production"}
                className="text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <ChevronLeftIcon className="w-5 h-5 mr-1" />
                {isFromArchive ? "Powrót do archiwum" : "Powrót do przewodników"}
              </Link>
              
              {isRefetching && (
                <span className="ml-3 text-xs text-gray-500 flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Dane aktualizowane automatycznie...
                </span>
              )}
            </div>
            
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              disabled={isRefetching}
            >
              <ArrowPathIcon className={`h-4 w-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
              Odśwież
            </button>
          </div>
          
          {/* Title and priority - umieszczone w białym kontenerze */}
          <div className="bg-white shadow rounded-lg p-6 mb-6 w-full">
            <div className={`
              flex flex-col sm:flex-row justify-between items-start
              ${guideData.priority === 'CRITICAL' ? 'mb-4' : guideData.priority === 'HIGH' ? 'mb-4' : ''}
            `}>
              <div>
                <h1 className={`text-2xl font-bold mb-2 ${guideData.priority === 'CRITICAL' ? 'text-red-700 animate-pulse' : ''}`}>
                  {guideData.title}
                  {guideData.priority === 'CRITICAL' && (
                    <span className="ml-2 inline-block animate-bounce">⚠️</span>
                  )}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <StatusBadge status={guideData.status} />
                  <PriorityBadge priority={guideData.priority} size={guideData.priority === 'CRITICAL' || guideData.priority === 'HIGH' ? 'large' : 'normal'} />
                  <span className="text-sm text-gray-500">
                    Termin: {formatDate(guideData.deadline)}
                  </span>
                  {guideData.priority === 'CRITICAL' && (
                    <span className="text-xs font-bold text-red-600 border border-red-300 rounded px-1 bg-red-50">
                      Wymaga natychmiastowej uwagi!
                    </span>
                  )}
                  {guideData.priority === 'HIGH' && (
                    <span className="text-xs text-orange-600 border border-orange-200 rounded px-1 bg-orange-50">
                      Pilne
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    Kod kreskowy: {guideData.barcode}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                {hasPermission('production', 'update') && (
                  <Link
                    to={`/production/guides/${id}/edit`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Edytuj przewodnik
                  </Link>
                )}
                {hasPermission('production', 'update') && !isFromArchive && guideData.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => setShowArchiveModal(true)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Archiwizuj
                  </button>
                )}
                {isFromArchive && (
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded border border-yellow-300">
                    <span className="font-medium">Podgląd z archiwum</span>
                  </div>
                )}
                {hasPermission('production', 'create') && (
                  <button
                    onClick={openSaveTemplateModal}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
                    title="Zapisz jako szablon wielokrotnego użytku"
                  >
                    Zapisz jako szablon
                  </button>
                )}
                {hasPermission('production', 'delete', 2) && (
                  <button
                    onClick={handleGuideDelete}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    disabled={deleteGuideMutation.isLoading}
                  >
                    {deleteGuideMutation.isLoading ? 'Usuwanie...' : 'Usuń'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Description */}
            {guideData.description && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold mb-2">Opis</h2>
                <p className="text-gray-700 whitespace-pre-line">{guideData.description}</p>
              </div>
            )}
          </div>

          {/* Guide progress section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-2">Postęp</h2>
            <ProgressBar guide={processedGuideData} autoUpdateStatus={!isFromArchive} />
          </div>

          {/* Guide stats */}
          {statsData && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-2">Statystyki</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Statystyki kroków</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Wszystkich kroków</p>
                      <p className="text-lg font-medium">{statsData.steps?.total || guideData.steps?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Ukończonych</p>
                      <p className="text-lg font-medium">{statsData.steps?.completed || guideData.steps?.filter(s => s.status === 'COMPLETED').length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">W trakcie</p>
                      <p className="text-lg font-medium">{statsData.steps?.inProgress || guideData.steps?.filter(s => s.status === 'IN_PROGRESS').length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Oczekujących</p>
                      <p className="text-lg font-medium">{statsData.steps?.pending || guideData.steps?.filter(s => s.status === 'PENDING').length || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Statystyki czasu</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Szacowany czas</p>
                      <p className="text-lg font-medium">
                        {statsData.time?.totalEstimatedTime || 
                          guideData.steps?.reduce((sum, step) => sum + (step.estimatedTime || 0), 0) || 0} min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rzeczywisty czas</p>
                      <p className="text-lg font-medium">
                        {statsData.time?.totalActualTime || 
                          guideData.steps?.reduce((sum, step) => sum + (step.actualTime || 0), 0) || 0} min
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Efektywność czasowa</p>
                      <p className="text-lg font-medium">
                        {statsData.time?.progress ? 
                          `${Math.round(statsData.time.progress)}%` : 
                          'Brak danych'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assigned Users Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Przypisani użytkownicy</h2>
              {hasPermission('production', 'update') && (
                <button
                  onClick={handleToggleAssignUsers}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  {showAssignUsers ? 'Anuluj' : 'Zarządzaj użytkownikami'}
                </button>
              )}
            </div>
            {showAssignUsers ? (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Szukaj użytkowników..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  />
                </div>
                {isUsersLoading ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Ładowanie użytkowników...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 max-h-60 overflow-y-auto border border-gray-200 rounded">
                      {usersData?.users?.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                          {usersData.users.map((user) => (
                            <li key={user.id} className="p-2 hover:bg-gray-100">
                              <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user.id)}
                                  onChange={() => handleUserSelection(user.id)}
                                  className="h-4 w-4 text-indigo-600"
                                />
                                <span>{user.firstName} {user.lastName}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="p-4 text-center text-gray-500">Nie znaleziono użytkowników</p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleAssignUsers}
                        disabled={assignUsersMutation.isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                      >
                        {assignUsersMutation.isLoading ? 'Zapisywanie...' : 'Zapisz przypisania'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                {guideData.assignedUsers && guideData.assignedUsers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {guideData.assignedUsers.map((assignment) => (
                      <div key={assignment.userId} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                        <div className="flex items-center">
                          <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                            <span className="text-indigo-800 font-medium">
                              {assignment.user?.firstName?.charAt(0)}{assignment.user?.lastName?.charAt(0)}
                            </span>
                          </div>
                          <span>{assignment.user?.firstName} {assignment.user?.lastName}</span>
                        </div>
                        {hasPermission('production', 'update') && (
                          <button 
                            onClick={() => handleRemoveUser(
                              assignment.userId, 
                              `${assignment.user?.firstName} ${assignment.user?.lastName}`
                            )}
                            className="text-red-500 hover:text-red-700 ml-2"
                            title="Usuń użytkownika"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Brak przypisanych użytkowników do tego przewodnika</p>
                )}
              </div>
            )}
          </div>

          {/* Manual Work Entry Form - Add work time directly to the guide */}
          {hasPermission('production', 'work') && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Dodaj ręczny wpis czasu pracy</h2>
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const stepId = formData.get('stepId');

                  const data = {
                    timeWorked: parseInt(formData.get('durationMinutes')),
                    notes: formData.get('note')
                  };

                  if (!stepId) {
                    toast.error('Proszę wybrać krok');
                    return;
                  }

                  if (!data.timeWorked || data.timeWorked <= 0) {
                    toast.error('Proszę wprowadzić poprawny czas trwania');
                    return;
                  }

                  // Get the current step
                  const selectedStep = guideData.steps.find(step => step.id === stepId);
                  if (!selectedStep) return;
                  
                  // Use the step-specific work entry endpoint
                  productionApi.addWorkEntry(stepId, data)
                    .then(() => {
                      toast.success('Czas pracy zapisany pomyślnie');
                      
                      // First refetch the guide data to get the latest step information
                      return queryClient.fetchQuery({
                        queryKey: ['guide', id],
                        queryFn: () => productionApi.getGuideById(id, { includeSteps: true })
                      });
                    })
                    .then((updatedGuideData) => {
                      // Get the updated step with fresh data
                      const updatedStep = updatedGuideData.steps.find(s => s.id === stepId);
                      if (!updatedStep) return;
                      
                      // Check if frontend status still doesn't match what it should be based on time
                      const shouldBeCompleted = updatedStep.estimatedTime > 0 && 
                                                updatedStep.actualTime >= updatedStep.estimatedTime;
                      
                      // Only update status if it doesn't match what it should be
                      if (shouldBeCompleted && updatedStep.status !== 'COMPLETED') {
                        const statusUpdateData = new FormData();
                        statusUpdateData.append('status', 'COMPLETED');
                        
                        return productionApi.updateStep(stepId, statusUpdateData)
                          .then(() => {
                            toast.info(`Krok oznaczony jako Zakończony ponieważ wymagany czas został wypełniony.`);
                            return queryClient.invalidateQueries(['guide', id]);
                          })
                          .catch(error => {
                            console.error('Error updating step status:', error);
                          });
                      } else if (updatedStep.status === 'PENDING' && updatedStep.actualTime > 0) {
                        // Handle PENDING → IN_PROGRESS transition if needed
                        const statusUpdateData = new FormData();
                        statusUpdateData.append('status', 'IN_PROGRESS');
                        
                        return productionApi.updateStep(stepId, statusUpdateData)
                          .then(() => {
                            toast.info(`Status kroku zaktualizowany na W trakcie.`);
                            return queryClient.invalidateQueries(['guide', id]);
                          })
                          .catch(error => {
                            console.error('Error updating step status:', error);
                          });
                      } else {
                        // If no status update is needed, just refresh the data
                        return queryClient.invalidateQueries(['guide', id]);
                      }
                    })
                    .finally(() => {
                      // Always reset the form, regardless of the outcome
                      e.target.reset();
                    })
                    .catch(err => {
                      // Handle time limit exceeded error
                      if (err.response && err.response.status === 400) {
                        const errorData = err.response.data;
                        
                        if (errorData && 
                            (errorData.message?.includes('time limit') || 
                             errorData.message?.includes('exceeded') ||
                             errorData.message?.includes('Available'))) {
                          // Show specific error message for time limit
                          toast.error(`Przekroczony limit czasu. ${errorData.message}`, {
                            autoClose: 5000, // Longer timeout for this important message
                          });
                          return;
                        }
                      }
                      
                      // Default error handling
                      toast.error(`Błąd: ${err.message}`);
                    });
                }}>
                  <div className="mb-3">
                    <label htmlFor="stepId" className="block text-sm font-medium text-gray-700 mb-1">
                      Wybierz krok <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="stepId"
                      name="stepId"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      onChange={(e) => {
                        // Odświeżenie formularza przy zmianie kroku
                        const stepId = e.target.value;
                        if (!stepId) return;
                        
                        // Znalezienie wybranego kroku
                        const selectedStep = guideData.steps.find(step => step.id === stepId);
                        if (!selectedStep) return;
                        
                        // Opcjonalnie: aktualizacja innych pól na podstawie wybranego kroku
                        // np. można ustawić domyślny czas lub notatkę
                      }}
                    >
                      <option value="">-- Wybierz krok --</option>
                      {getSortedSteps().map(step => {
                        // Obliczenie pozostałego czasu
                        const estimatedTime = step.estimatedTime || 0;
                        const actualTime = step.actualTime || 0;
                        const remainingTime = estimatedTime > 0 ? Math.max(0, estimatedTime - actualTime) : 0;
                        
                        // Opis statusu czasu
                        let timeInfo = '';
                        if (estimatedTime > 0) {
                          if (remainingTime > 0) {
                            timeInfo = ` (pozostało: ${remainingTime} min z ${estimatedTime} min)`;
                          } else {
                            timeInfo = ` (czas wykorzystany: ${actualTime}/${estimatedTime} min)`;
                          }
                        } else if (actualTime > 0) {
                          timeInfo = ` (wykorzystano: ${actualTime} min)`;
                        }
                        
                        return (
                          <option key={step.id} value={step.id}>
                            {step.order}. {step.title} {step.status === 'COMPLETED' ? '(Zakończony)' : ''}{timeInfo}
                          </option>
                        );
                      })}
                    </select>
                    <div className="mt-1 text-xs text-gray-500">
                      Informacje o czasie pokazują, ile minut pozostało do przepracowania w stosunku do szacowanego czasu.
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                      Czas trwania (minuty) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="durationMinutes"
                      name="durationMinutes"
                      min="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                      Notatka (opcjonalnie)
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      placeholder="Opisz wykonaną pracę..."
                    ></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Zapisz czas pracy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Attachments section */}
          {guideData.attachments && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Załączniki</h2>
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <AttachmentsViewer 
                  attachments={guideData.attachments}
                  entityType="guide"
                  entityId={id}
                />
              </div>
            </div>
          )}

          {/* Work Time History */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Historia czasu pracy</h2>
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <WorkTimeHistory 
                guideId={id}
                onError={(err) => {
                  console.warn('Work time history error:', err);
                  // Don't show toast to avoid duplicate errors
                }}
                onTimeUpdate={() => {
                  // Refetch guide data when time entries are updated
                  queryClient.invalidateQueries(['guide', id]);
                }}
                fallbackMessage="Brak zapisów czasu pracy dla tego przewodnika."
              />
            </div>
          </div>
        </div>

        {/* Steps section */}
        <div className="bg-white shadow rounded-lg ">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Kroki produkcyjne</h2>
              {hasPermission('production', 'update') && !showStepForm && (
                <button
                  onClick={openStepForm}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
                >
                  <svg
                    className="w-5 h-5 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Dodaj etap
                </button>
              )}
            </div>

            {/* Step form */}
            {showStepForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingStep ? 'Edytuj krok' : 'Dodaj nowy krok'}
                </h3>
                <form onSubmit={handleStepSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Tytuł <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={stepFormData.title}
                        onChange={handleStepFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="order"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Kolejność
                      </label>
                      <input
                        type="number"
                        id="order"
                        name="order"
                        value={stepFormData.order}
                        onChange={handleStepFormChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Opis
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={stepFormData.description}
                      onChange={handleStepFormChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="estimatedTime"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Szacowany czas (minuty)
                    </label>
                    <input
                      type="number"
                      id="estimatedTime"
                      name="estimatedTime"
                      value={stepFormData.estimatedTime}
                      onChange={handleStepFormChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetStepForm}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={addStepMutation.isLoading || updateStepMutation.isLoading}
                    >
                      {addStepMutation.isLoading || updateStepMutation.isLoading
                        ? 'Zapisywanie...'
                        : 'Zapisz krok'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filtry kroków */}
            {guideData.steps && guideData.steps.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Filtry etapów</h3>
                  <button
                    onClick={resetStepFilters}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Resetuj filtry
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Filtr statusu */}
                  <div>
                    <label htmlFor="status" className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={stepFilters.status}
                      onChange={handleStepFilterChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="">Wszystkie statusy</option>
                      <option value="PENDING">Oczekujące</option>
                      <option value="IN_PROGRESS">W trakcie</option>
                      <option value="COMPLETED">Ukończone</option>
                    </select>
                  </div>

                  {/* Filtr przypisanych użytkowników */}
                  <div>
                    <label htmlFor="assignedUser" className="block text-xs font-medium text-gray-700 mb-1">
                      Przypisany użytkownik
                    </label>
                    <select
                      id="assignedUser"
                      name="assignedUser"
                      value={stepFilters.assignedUser}
                      onChange={handleStepFilterChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="">Wszyscy użytkownicy</option>
                      {/* Lista unikalnych użytkowników przypisanych do kroków */}
                      {Array.from(new Set(
                        guideData.steps
                          .flatMap(step => step.assignedUsers || [])
                          .map(assignment => assignment.userId)
                      )).map(userId => {
                        const userAssignment = guideData.steps
                          .flatMap(step => step.assignedUsers || [])
                          .find(assignment => assignment.userId === userId);
                        
                        const user = userAssignment?.user;
                        if (!user) return null;
                        
                        return (
                          <option key={userId} value={userId}>
                            {user.firstName} {user.lastName}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Filtr tekstowy */}
                  <div>
                    <label htmlFor="searchText" className="block text-xs font-medium text-gray-700 mb-1">
                      Wyszukaj w nazwie/opisie
                    </label>
                    <input
                      type="text"
                      id="searchText"
                      name="searchText"
                      value={stepFilters.searchText}
                      onChange={handleStepFilterChange}
                      placeholder="Szukaj..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>

                  {/* Opcja "Moje kroki" */}
                  <div className="flex items-end">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showOnlyMySteps"
                        checked={stepFilters.showOnlyMySteps}
                        onChange={handleStepFilterChange}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Tylko moje etapy</span>
                    </label>
                  </div>
                </div>
                
                {/* Informacja o aktywnych filtrach */}
                {(stepFilters.status || stepFilters.assignedUser || stepFilters.searchText || stepFilters.showOnlyMySteps) && (
                  <div className="mt-3 text-xs text-gray-500">
                    <p>
                      Wyświetlanie {getFilteredSteps().length} z {getSortedSteps().length} kroków
                      {stepFilters.showOnlyMySteps && ' (tylko Twoje kroki)'}
                      {stepFilters.status && ` (status: ${
                        stepFilters.status === 'PENDING' ? 'Oczekujące' : 
                        stepFilters.status === 'IN_PROGRESS' ? 'W trakcie' : 
                        stepFilters.status === 'COMPLETED' ? 'Ukończone' : 
                        stepFilters.status
                      })`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Steps table with Drag & Drop functionality */}
            {guideData.steps && guideData.steps.length > 0 ? (
              <DraggableStepList
                steps={getFilteredSteps()}
                guideId={id}
                hasPermission={hasPermission}
                openEditStepForm={openEditStepForm}
                handleStepDelete={handleStepDelete}
                setSelectedStep={setSelectedStep}
                setShowStepAssignModal={setShowStepAssignModal}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Brak etapów w tym przewodniku.
                </p>
                {hasPermission('production', 'update') && !showStepForm && (
                  <button
                    onClick={openStepForm}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 px-4 rounded"
                  >
                    Dodaj pierwszy etap
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Inventory section */}
        {renderInventorySection()}
      </div>
      
      {/* Render the step assignment modal */}
      {showStepAssignModal && (
        <StepAssignmentModal
          step={selectedStep}
          isOpen={showStepAssignModal}
          onClose={() => setShowStepAssignModal(false)}
        />
      )}

      {/* Save as Template Modal */}
      {showSaveTemplateModal && (
        <Modal
          title="Zapisz jako szablon"
          onClose={() => setShowSaveTemplateModal(false)}
        >
          <div className="p-4">
            <div className="mb-4">
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
                Nazwa szablonu
              </label>
              <input
                type="text"
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Wprowadź nazwę szablonu"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Zapisz szablon
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Archiwizacja przewodnika</h2>
            <p className="mb-4 text-gray-700">
              Czy na pewno chcesz zarchiwizować ten przewodnik? Spowoduje to przeniesienie go do archiwum i uczyni niedostępnym dla produkcji.
            </p>
            
            <div className="mb-4">
              <label htmlFor="archiveReason" className="block text-sm font-medium text-gray-700 mb-1">
                Powód archiwizacji <span className="text-red-500">*</span>
              </label>
              <textarea
                id="archiveReason"
                ref={archiveReasonRef}
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows="3"
                placeholder="Podaj powód archiwizacji tego przewodnika"
                autoFocus
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                onClick={handleArchiveGuide}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
              >
                Zarchiwizuj przewodnik
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductionGuideDetailsPage;
