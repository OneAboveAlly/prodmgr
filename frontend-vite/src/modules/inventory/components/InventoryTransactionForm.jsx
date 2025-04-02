// frontend-vite/src/modules/inventory/components/InventoryTransactionForm.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FiPlus, FiMinus, FiAlertCircle } from 'react-icons/fi';

const InventoryTransactionForm = ({ item, onAdd, onRemove, canForceRemove = false }) => {
  const [transactionType, setTransactionType] = useState('add');
  const [showForceWarning, setShowForceWarning] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    defaultValues: {
      quantity: '',
      reason: '',
      forceRemove: false
    }
  });
  
  const watchQuantity = watch('quantity');
  const watchForceRemove = watch('forceRemove');
  
  // Calculate available quantity
  const reserved = item?.reserved || 0;
  const available = Math.max(0, (item?.quantity || 0) - reserved);
  
  // Watch for attempts to remove more than available
  React.useEffect(() => {
    if (
      transactionType === 'remove' &&
      parseFloat(watchQuantity) > available && 
      !watchForceRemove
    ) {
      setShowForceWarning(true);
    } else {
      setShowForceWarning(false);
    }
  }, [watchQuantity, available, transactionType, watchForceRemove]);
  
  const submitForm = (data) => {
    const quantity = parseFloat(data.quantity);
    
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Ilość musi być liczbą większą od 0');
      return;
    }
    
    if (transactionType === 'add') {
      onAdd(quantity, data.reason);
    } else {
      onRemove(quantity, data.reason, data.forceRemove);
    }
    
    reset();
  };
  
  return (
    <form onSubmit={handleSubmit(submitForm)} className="bg-white p-4 rounded-md shadow-sm border">
      <h3 className="text-lg font-medium mb-4">Dodaj/Pobierz z magazynu</h3>
      
      <div className="mb-4">
        <div className="flex space-x-2 mb-4">
            <button
              type="button"
              onClick={() => setTransactionType('add')}
              className={`flex items-center px-4 py-2 border rounded-md ${
                transactionType === 'add'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <FiPlus className="mr-2" />
              Dodaj do magazynu
            </button>
            <button
              type="button"
              onClick={() => setTransactionType('remove')}
              className={`flex items-center px-4 py-2 border rounded-md ${
                transactionType === 'remove'
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <FiMinus className="mr-2" />
              Pobierz z magazynu
            </button>