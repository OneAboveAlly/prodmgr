import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import SelectRole from '../../components/roles/SelectRole';
import productionApi from '../../api/production.api';
import api from '../../services/api.service';
import { X, Send, Bell } from 'lucide-react';

const EditStepModal = ({ step, guideId, onClose }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    estimatedTime: '',
    assignedToRole: '',
    status: '',
    attachments: []
  });
  
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [notifyCreator, setNotifyCreator] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);
  const [notificationText, setNotificationText] = useState('');

  const queryClient = useQueryClient();

  // Fetch guide details to get creator info
  const { data: guideData } = useQuery({
    queryKey: ['productionGuide', guideId],
    queryFn: () => productionApi.getGuideById(guideId),
    enabled: notifyCreator,
  });

  // Get users with the assigned role
  const { data: usersWithRole } = useQuery({
    queryKey: ['usersWithRole', form.assignedToRole],
    queryFn: () => api.get(`/users/role/${form.assignedToRole}`).then(res => res.data),
    enabled: !!form.assignedToRole && sendNotification,
  });

  useEffect(() => {
    if (step) {
      setForm({
        title: step.title || '',
        description: step.description || '',
        estimatedTime: step.estimatedTime || '',
        assignedToRole: step.assignedToRole || '',
        status: step.status || 'PENDING',
        attachments: []
      });
      
      // Default notification text
      setNotificationText(`Step "${step.title}" has been updated in guide #${guideId}`);
    }
  }, [step, guideId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      data.append('title', form.title);
      data.append('description', form.description);
      
      if (form.estimatedTime) {
        data.append('estimatedTime', form.estimatedTime);
      }
      
      if (form.assignedToRole) {
        data.append('assignedToRole', form.assignedToRole);
      }
      
      data.append('status', form.status);
      
      if (form.attachments && form.attachments.length > 0) {
        form.attachments.forEach(file => data.append('attachments', file));
      }

      const updateResult = await productionApi.updateStep(step.id, data);
      
      // Send notifications if enabled
      if (sendNotification) {
        // Collect recipient IDs
        const recipientIds = [...selectedUsers];
        
        // Add guide creator if option selected
        if (notifyCreator && guideData?.guide?.createdById) {
          recipientIds.push(guideData.guide.createdById);
        }
        
        // Add users with role if any
        if (form.assignedToRole && usersWithRole?.length > 0) {
          usersWithRole.forEach(user => {
            if (!recipientIds.includes(user.id)) {
              recipientIds.push(user.id);
            }
          });
        }
        
        // Send notifications if we have recipients
        if (recipientIds.length > 0) {
          await api.post('/notifications/schedule', {
            userIds: recipientIds,
            content: notificationText,
            link: `/production/guides/${guideId}`,
            sendNow: true
          });
        }
      }
      
      return updateResult;
    },
    onSuccess: () => {
      toast.success('Step updated successfully');
      queryClient.invalidateQueries(['productionGuide', guideId]);
      onClose();
    },
    onError: (err) => {
      console.error('Error updating step:', err);
      toast.error(err.response?.data?.message || 'Error updating step');
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm(prev => ({ ...prev, attachments: Array.from(e.target.files) }));
  };

  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.title) {
      toast.error('Step title is required');
      return;
    }
    
    mutation.mutate();
  };

  return (
    <Modal title={`✏️ Edit Step: ${step.title}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />
        <Textarea
          label="Description"
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Estimated Time (minutes)"
            name="estimatedTime"
            type="number"
            value={form.estimatedTime}
            onChange={handleChange}
            min="1"
          />
          <div>
            <label className="block font-medium mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded border border-gray-300 p-2"
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
        <SelectRole
          label="Assigned Role"
          value={form.assignedToRole}
          onChange={(value) => setForm(prev => ({ ...prev, assignedToRole: value }))}
          includeEmpty
        />
        <div>
          <label className="block font-medium mb-1">Attachments (optional)</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full"
          />
          {form.attachments.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Selected {form.attachments.length} {form.attachments.length === 1 ? 'file' : 'files'}
            </p>
          )}
        </div>

        {/* Notification Options */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="sendNotification"
              checked={sendNotification}
              onChange={() => setSendNotification(!sendNotification)}
              className="mr-2"
            />
            <label htmlFor="sendNotification" className="font-medium flex items-center">
              <Bell size={16} className="mr-1" />
              Send notifications about this update
            </label>
          </div>
          
          {sendNotification && (
            <div className="ml-6 space-y-3">
              <Textarea
                label="Notification Message"
                value={notificationText}
                onChange={(e) => setNotificationText(e.target.value)}
                rows={2}
              />
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifyCreator"
                  checked={notifyCreator}
                  onChange={() => setNotifyCreator(!notifyCreator)}
                  className="mr-2"
                />
                <label htmlFor="notifyCreator">
                  Notify guide creator
                </label>
              </div>
              
              {/* We assume there would be a separate component to select users for notifications */}
              {/* This is a simplified version */}
              <div>
                <label className="block text-sm font-medium mb-1">Select additional recipients:</label>
                <div className="mt-2 border rounded p-2 max-h-40 overflow-y-auto">
                  {/* You would replace this with actual user data */}
                  <p className="text-sm text-gray-500 italic">
                    A user selection component would go here to choose notification recipients.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mr-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isLoading || !form.title}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {mutation.isLoading ? 'Updating...' : (
              <>
                <Send size={16} className="mr-1" />
                Update Step
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditStepModal;