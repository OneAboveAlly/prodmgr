// frontend-vite/src/modules/inventory/components/InventoryItemForm.jsx
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FiUpload, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';

const InventoryItemForm = ({ initialData, onSubmit, categories = [] }) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: initialData || {
      name: '',
      description: '',
      barcode: '',
      unit: 'pieces',
      quantity: 0,
      location: '',
      minQuantity: '',
      category: ''
    }
  });
  
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);
  
  const handleFileSelect = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };
  
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const submitForm = (data) => {
    // Convert numeric strings to numbers
    if (data.quantity) data.quantity = parseFloat(data.quantity);
    if (data.minQuantity) data.minQuantity = parseFloat(data.minQuantity);
    
    // Add files to the data
    data.attachments = files;
    
    // Submit the form
    onSubmit(data);
  };
  
  return (
    <form onSubmit={handleSubmit(submitForm)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nazwa przedmiotu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              {...register('name', { required: 'Nazwa jest wymagana' })}
              className={`mt-1 block w-full rounded-md border ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } shadow-sm px-3 py-2`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
              Kod kreskowy
            </label>
            <input
              type="text"
              id="barcode"
              {...register('barcode')}
              placeholder="Generowany automatycznie, jeśli pusty"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
            />
          </div>
          
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
              Jednostka <span className="text-red-500">*</span>
            </label>
            <select
              id="unit"
              {...register('unit', { required: 'Jednostka jest wymagana' })}
              className={`mt-1 block w-full rounded-md border ${
                errors.unit ? 'border-red-500' : 'border-gray-300'
              } shadow-sm px-3 py-2`}
            >
              <option value="pieces">Sztuki</option>
              <option value="kg">Kilogramy</option>
              <option value="liters">Litry</option>
              <option value="meters">Metry</option>
              <option value="packages">Opakowania</option>
              <option value="sets">Zestawy</option>
            </select>
            {errors.unit && (
              <p className="mt-1 text-sm text-red-500">{errors.unit.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Ilość początkowa
            </label>
            <input
              type="number"
              id="quantity"
              step="0.01"
              min="0"
              {...register('quantity', {
                valueAsNumber: true,
                min: { value: 0, message: 'Ilość nie może być ujemna' }
              })}
              className={`mt-1 block w-full rounded-md border ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              } shadow-sm px-3 py-2`}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-500">{errors.quantity.message}</p>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Kategoria
            </label>
            <div className="flex space-x-2">
              <select
                id="category"
                {...register('category')}
                className="mt-1 flex-grow rounded-md border-gray-300 shadow-sm px-3 py-2"
              >
                <option value="">Wybierz kategorię</option>
                {categories.map((category, index) => (
                  <option key={index} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Lokalizacja w magazynie
            </label>
            <input
              type="text"
              id="location"
              {...register('location')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
            />
          </div>
          
          <div>
            <label htmlFor="minQuantity" className="block text-sm font-medium text-gray-700">
              Minimalna ilość (alert)
            </label>
            <input
              type="number"
              id="minQuantity"
              step="0.01"
              min="0"
              {...register('minQuantity', {
                min: { value: 0, message: 'Ilość minimalna nie może być ujemna' }
              })}
              className={`mt-1 block w-full rounded-md border ${
                errors.minQuantity ? 'border-red-500' : 'border-gray-300'
              } shadow-sm px-3 py-2`}
            />
            {errors.minQuantity && (
              <p className="mt-1 text-sm text-red-500">{errors.minQuantity.message}</p>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Opis
        </label>
        <textarea
          id="description"
          rows={3}
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Załączniki
        </label>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiUpload className="mr-2 -ml-1 h-5 w-5" />
            Dodaj pliki
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
        </div>
        
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center">
                  <span className="text-sm text-gray-700 truncate max-w-md">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Anuluj
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {initialData ? 'Aktualizuj przedmiot' : 'Dodaj przedmiot'}
        </button>
      </div>
    </form>
  );
};

export default InventoryItemForm;