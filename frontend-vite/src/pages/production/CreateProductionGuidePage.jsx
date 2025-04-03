import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import productionApi from '../../api/production.api';
import { toast } from 'react-toastify';

const CreateProductionGuidePage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    barcode: '',
    attachments: [],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm((prev) => ({ ...prev, attachments: Array.from(e.target.files) }));
  };

  const { mutate, isLoading } = useMutation({
    mutationFn: (formData) => productionApi.createGuide(formData),
    onSuccess: (data) => {
      toast.success('Przewodnik utworzony');
      console.log('Redirecting to:', `/production/guides/${data.guide.id}`);
      if (data?.guide?.id) {
        navigate(`/production/guides/${data.guide.id}`);
      } else {
        console.error('Missing guide ID in response:', data);
        toast.error('Utworzono przewodnik, ale wystąpił problem z przekierowaniem');
      }
    },
    onError: (err) => {
      console.error('Error creating guide:', err);
      toast.error(err.response?.data?.message || 'Błąd tworzenia przewodnika');
    }
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('priority', form.priority);
    if (form.barcode) formData.append('barcode', form.barcode);
    
    // Add each file individually
    if (form.attachments && form.attachments.length > 0) {
      form.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }
    
    mutate(formData);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Nowy Przewodnik Produkcyjny</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Tytuł</label>
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
          <label className="block font-medium">Opis</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 rounded p-2"
          ></textarea>
        </div>

        <div>
          <label className="block font-medium">Priorytet</label>
          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          >
            <option value="NORMAL">Normalny</option>
            <option value="CRITICAL">Krytyczny</option>
            <option value="LOW">Niski</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Kod kreskowy (opcjonalnie)</label>
          <input
            type="text"
            name="barcode"
            value={form.barcode}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Załączniki (max 10)</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full border border-gray-300 rounded p-2"
          />
          {form.attachments.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Wybrano {form.attachments.length} {form.attachments.length === 1 ? 'plik' : 'plików'}
            </p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || !form.title}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Tworzenie...' : 'Utwórz Przewodnik'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductionGuidePage;