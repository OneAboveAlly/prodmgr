// frontend-vite/src/modules/production/components/ProductionGuideForm.jsx
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { FiUpload, FiX } from 'react-icons/fi';

const ProductionGuideForm = ({ initialData, onSubmit }) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: initialData || {
      title: '',
      description: '',
      barcode: '',
      priority: 'NORMAL',
      status: 'DRAFT'
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
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Tytuł przewodnika <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              {...register('title', { required: 'Tytuł jest wymagany' })}
              className={`mt-1 block w-full rounded-md border ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              } shadow-sm px-3 py-2`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
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
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priorytet
            </label>
            <select
              id="priority"
              {...register('priority')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
            >
              <option value="LOW">Niski</option>
              <option value="NORMAL">Normalny</option>
              <option value="HIGH">Wysoki</option>
              <option value="CRITICAL">Krytyczny</option>
            </select>
          </div>
          
          {initialData && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                {...register('status')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
              >
                <option value="DRAFT">Szkic</option>
                <option value="IN_PROGRESS">W trakcie</option>
                <option value="COMPLETED">Zakończony</option>
                <option value="CANCELLED">Anulowany</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Opis
        </label>
        <textarea
          id="description"
          rows={4}
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
          {initialData ? 'Aktualizuj przewodnik' : 'Utwórz przewodnik'}
        </button>
      </div>
    </form>
  );
};

export default ProductionGuideForm;