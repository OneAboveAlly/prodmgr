import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import templatesApi from '../../api/templates.api';
import { Save } from 'lucide-react';

const SaveAsTemplateModal = ({ guide, onClose }) => {
  const [form, setForm] = useState({
    name: guide?.title || '',
    description: guide?.description || '',
    category: '',
    isPublic: true
  });
  
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: () => templatesApi.createTemplateFromGuide(guide.id, form),
    onSuccess: () => {
      toast.success('Guide saved as template successfully');
      queryClient.invalidateQueries(['productionTemplates']);
      onClose();
    },
    onError: (error) => {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.message || 'Error saving template');
    }
  });
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('Template name is required');
      return;
    }
    
    mutation.mutate();
  };
  
  return (
    <Modal title="Save Guide as Template" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Template Name"
          name="name"
          value={form.name}
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
        
        <Input
          label="Category (optional)"
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="E.g., Manufacturing, Assembly, Maintenance"
        />
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublic"
            name="isPublic"
            checked={form.isPublic}
            onChange={handleChange}
            className="mr-2"
          />
          <label htmlFor="isPublic">
            Make this template available to all users
          </label>
        </div>
        
        <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-800">
          <p><strong>Note:</strong> This will create a template with the following:</p>
          <ul className="list-disc ml-5 mt-1">
            <li>All current steps from this guide</li>
            <li>Inventory items (if any)</li>
            <li>Estimated times and role assignments</li>
          </ul>
          <p className="mt-1">User assignments and actual logged time will not be included.</p>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isLoading || !form.name}
            className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            <Save size={16} />
            {mutation.isLoading ? 'Saving...' : 'Save as Template'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SaveAsTemplateModal;