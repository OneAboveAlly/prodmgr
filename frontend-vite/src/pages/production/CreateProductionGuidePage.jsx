import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import productionApi from '../../api/production.api';
import inventoryApi from '../../api/inventory.api';
import api from '../../services/api.service';
import { toast } from 'react-toastify';
import Spinner from '../../components/common/Spinner';
import { Package, Bell, Calendar, AlertTriangle } from 'lucide-react';

const CreateProductionGuidePage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    barcode: '',
    dueDate: '',
    attachments: [],
    selectedItems: [],
    notifyWarehousemen: false
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
    if (form.dueDate) {
      const suggestedPriority = calculatePriority(form.dueDate);
      setForm(prev => ({ ...prev, priority: suggestedPriority }));
    }
  }, [form.dueDate]);

  // Get inventory items for selection
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => inventoryApi.getInventoryItems({ limit: 100 }),
    select: (data) => data.items || []
  });

  // Get users with Warehouseman role for notifications
  const { data: warehouseUsers } = useQuery({
    queryKey: ['warehouseUsers'],
    queryFn: () => api.get('/users/role/warehouseman').then(res => res.data),
    enabled: form.notifyWarehousemen
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleFileChange = (e) => {
    setForm(prev => ({ ...prev, attachments: Array.from(e.target.files) }));
  };

  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    const item = inventoryData.find(i => i.id === itemId);
    
    if (item) {
      // Check if already selected
      if (form.selectedItems.some(si => si.id === item.id)) {
        return; // Item already in the list
      }
      
      setForm(prev => ({
        ...prev,
        selectedItems: [
          ...prev.selectedItems,
          { ...item, quantity: 1 } // Add with default quantity of 1
        ]
      }));
    }
  };

  const updateItemQuantity = (itemId, quantity) => {
    setForm(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.map(item =>
        item.id === itemId ? { ...item, quantity: parseInt(quantity) || 1 } : item
      )
    }));
  };

  const removeItem = (itemId) => {
    setForm(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.filter(item => item.id !== itemId)
    }));
  };

  const { mutate } = useMutation({
    mutationFn: async (formData) => {
      setIsSubmitting(true);
      try {
        // First create the guide
        const guideResult = await productionApi.createGuide(formData);
        const guideId = guideResult.guide.id;
        
        // If we have selected inventory items, add them to the guide
        if (form.selectedItems.length > 0) {
          const inventoryItems = form.selectedItems.map(item => ({
            itemId: item.id,
            quantity: item.quantity
          }));
          
          await api.post(`/production/guides/${guideId}/inventory`, {
            items: inventoryItems
          });
        }
        
        // If notification is enabled, send to warehouse users
        if (form.notifyWarehousemen && warehouseUsers?.length > 0) {
          const itemsList = form.selectedItems.map(item => 
            `${item.name} (${item.quantity} ${item.unit})`
          ).join(', ');
          
          await api.post('/notifications/schedule', {
            userIds: warehouseUsers.map(user => user.id),
            content: `New production guide "${form.title}" requires the following items: ${itemsList}`,
            link: `/production/guides/${guideId}`,
            sendNow: true
          });
        }
        
        return guideResult;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      toast.success('Guide created successfully');
      if (data?.guide?.id) {
        navigate(`/production/guides/${data.guide.id}`);
      } else {
        console.error('Missing guide ID in response:', data);
        toast.error('Guide created, but there was a problem with redirection');
      }
    },
    onError: (err) => {
      console.error('Error creating guide:', err);
      toast.error(err.response?.data?.message || 'Error creating guide');
    }
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('priority', form.priority);
    if (form.barcode) formData.append('barcode', form.barcode);
    if (form.dueDate) formData.append('dueDate', form.dueDate);
    
    // Add metadata for inventory items and notifications
    formData.append('metadata', JSON.stringify({
      inventoryItems: form.selectedItems.map(item => ({
        id: item.id,
        quantity: item.quantity
      })),
      notifyWarehousemen: form.notifyWarehousemen
    }));
    
    // Add each file individually
    if (form.attachments && form.attachments.length > 0) {
      form.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }
    
    mutate(formData);
  };

  if (isLoadingInventory) {
    return <Spinner label="Loading inventory items..." />;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">New Production Guide</h2>
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
            {form.dueDate && (
              <p className="text-xs text-gray-500 mt-1">
                <AlertTriangle size={12} className="inline mr-1" />
                Priority suggested based on due date
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block font-medium">Barcode (optional)</label>
          <input
            type="text"
            name="barcode"
            value={form.barcode}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
            placeholder="Leave empty to generate automatically"
          />
        </div>

        <div>
          <label className="block font-medium">Attachments (max 10)</label>
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

        {/* Inventory Items Section */}
        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium flex items-center mb-2">
            <Package size={18} className="mr-2" />
            Required Inventory Items
          </h3>
          
          <div className="flex gap-2 mb-3">
            <select 
              onChange={handleItemSelect}
              value=""
              className="flex-1 border border-gray-300 rounded p-2"
            >
              <option value="">Select an item to add</option>
              {inventoryData?.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} - {item.quantity} {item.unit} available
                </option>
              ))}
            </select>
          </div>
          
          {form.selectedItems.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {form.selectedItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.barcode}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                          className="w-20 border border-gray-300 rounded p-1 text-sm"
                        />
                        <span className="ml-1 text-sm text-gray-500">{item.unit}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity} / {item.quantity} {item.unit}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No items selected.</p>
          )}
          
          <div className="mt-3 flex items-center">
            <input
              type="checkbox"
              id="notifyWarehousemen"
              name="notifyWarehousemen"
              checked={form.notifyWarehousemen}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="notifyWarehousemen" className="flex items-center text-sm">
              <Bell size={16} className="mr-1 text-indigo-600" />
              Notify warehouse staff about required items
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => navigate('/production/guides')}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !form.title}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Guide'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductionGuidePage;