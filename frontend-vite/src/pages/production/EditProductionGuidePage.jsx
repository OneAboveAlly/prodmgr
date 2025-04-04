import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import productionApi from '../../api/production.api';
import api from '../../services/api.service';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';
import { AlertTriangle, Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const EditProductionGuidePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [originalPriority, setOriginalPriority] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    barcode: '',
    dueDate: '',
    status: 'DRAFT',
    attachments: []
  });

  // Fetch guide data
  const { data: guideData, isLoading, error } = useQuery({
    queryKey: ['productionGuide', id],
    queryFn: () => productionApi.getGuideById(id),
    onSuccess: (data) => {
      if (data && data.guide) {
        setForm({
          title: data.guide.title || '',
          description: data.guide.description || '',
          priority: data.guide.priority || 'NORMAL',
          barcode: data.guide.barcode || '',
          dueDate: data.guide.dueDate ? new Date(data.guide.dueDate).toISOString().split('T')[0] : '',
          status: data.guide.status || 'DRAFT',
          attachments: []
        });
        setOriginalPriority(data.guide.priority);
      }
    }
  });

  // Calculate default priority based on due date
  const calculatePriority = (dueDate) => {
    if (!dueDate) return 'NORMAL';
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 2) return 'CRITICAL';
    if (diffDays < 5) return 'HIGH';
    if (diffDays < 10) return 'MEDIUM';
    return 'LOW';
  };

  useEffect(() => {
    if (form.dueDate && !form.manualPriorityChange) {
      const suggestedPriority = calculatePriority(form.dueDate);
      setForm(prev => ({ ...prev, priority: suggestedPriority }));
    }
  }, [form.dueDate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'priority' && value !== form.priority) {
      // Track manual priority changes to ask for reason
      setForm(prev => ({ 
        ...prev, 
        [name]: value,
        manualPriorityChange: true 
      }));
    } else {
      setForm(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
  };

  const handleFileChange = (e) => {
    setForm(prev => ({ ...prev, attachments: Array.from(e.target.files) }));
  };

  // Update guide mutation
  const mutation = useMutation({
    mutationFn: async (formData) => {
      setIsSubmitting(true);
      try {
        return await productionApi.updateGuide(id, formData);
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      toast.success('Guide updated successfully');
      navigate(`/production/guides/${id}`);
      
      // Log to audit if priority changed with reason
      if (form.priority !== originalPriority && changeReason) {
        api.post('/audit-logs', {
          action: 'update',
          module: 'production',
          targetId: id,
          meta: {
            priorityChange: {
              from: originalPriority,
              to: form.priority,
              reason: changeReason
            }
          }
        }).catch(err => console.error('Error logging priority change:', err));
      }
    },
    onError: (err) => {
      console.error('Error updating guide:', err);
      toast.error(err.response?.data?.message || 'Error updating guide');
    }
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // If priority changed and no reason provided, ask for it
    if (form.priority !== originalPriority && form.manualPriorityChange && !changeReason) {
      setShowReasonModal(true);
      return;
    }
    
    submitForm();
  };
  
  const submitForm = () => {
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('priority', form.priority);
    formData.append('status', form.status);
    if (form.barcode) formData.append('barcode', form.barcode);
    if (form.dueDate) formData.append('dueDate', form.dueDate);
    
    // If priority changed, add the reason
    if (form.priority !== originalPriority && changeReason) {
      formData.append('priorityChangeReason', changeReason);
    }
    
    // Add each file individually
    if (form.attachments && form.attachments.length > 0) {
      form.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }
    
    mutation.mutate(formData);
  };

  // Access check
  if (!hasPermission('production', 'update')) {
    return (
      <div className="max-w-3xl mx-auto p-4 bg-white rounded-xl shadow-md mt-4">
        <div className="p-4 bg-red-100 rounded-lg text-red-700 mb-4">
          <AlertTriangle className="inline-block mr-2" size={20} />
          You don't have permission to edit production guides.
        </div>
        <button
          onClick={() => navigate(`/production/guides/${id}`)}
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Guide Details
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <Spinner label="Loading guide data..." />;
  }

  if (error || !guideData?.guide) {
    return (
      <div className="max-w-3xl mx-auto p-4 bg-white rounded-xl shadow-md mt-4">
        <div className="p-4 bg-red-100 rounded-lg text-red-700 mb-4">
          <AlertTriangle className="inline-block mr-2" size={20} />
          Error loading guide data: {error?.message || 'Guide not found'}
        </div>
        <button
          onClick={() => navigate('/production/guides')}
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Guides List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded-xl shadow-md">
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate(`/production/guides/${id}`)}
          className="flex items-center text-gray-600 hover:text-indigo-600 mr-2"
        >
          <ArrowLeft size={16} className="mr-1" /> Back
        </button>
        <h2 className="text-2xl font-bold">Edit Production Guide</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Title</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 rounded p-2"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Due Date</label>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2 pl-8"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            {form.priority !== originalPriority && (
              <p className="text-xs text-amber-600 mt-1">
                <AlertTriangle size={12} className="inline mr-1" />
                Priority change will require a reason
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Barcode</label>
            <input
              type="text"
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">
              Barcode cannot be modified
            </p>
          </div>

          <div>
            <label className="block font-medium">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-medium">Additional Attachments</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full border border-gray-300 rounded p-2"
          />
          {form.attachments.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Selected {form.attachments.length} {form.attachments.length === 1 ? 'file' : 'files'}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/production/guides/${id}`)}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !form.title}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Updating...' : 'Update Guide'}
          </button>
        </div>
      </form>

      {/* Priority Change Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Priority Change Reason</h3>
            <p className="text-gray-700 mb-4">
              Please provide a reason for changing the priority from {originalPriority} to {form.priority}.
            </p>
            <textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 mb-4"
              rows={3}
              placeholder="Enter reason here..."
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReasonModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!changeReason.trim()) {
                    toast.error('Please provide a reason for the priority change');
                    return;
                  }
                  setShowReasonModal(false);
                  submitForm();
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProductionGuidePage;