import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import SelectRole from '../../components/roles/SelectRole';
import productionApi from '../../api/production.api';

const AddStepModal = ({ guideId, onClose }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    estimatedTime: '',
    assignedToRole: '',
    attachments: []
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append('title', form.title);
      data.append('description', form.description);
      
      if (form.estimatedTime) {
        data.append('estimatedTime', form.estimatedTime);
      }
      
      if (form.assignedToRole) {
        data.append('assignedToRole', form.assignedToRole);
      }
      
      if (form.attachments && form.attachments.length > 0) {
        form.attachments.forEach(file => data.append('attachments', file));
      }

      return productionApi.addStep(guideId, data);
    },
    onSuccess: () => {
      toast.success('Dodano krok produkcyjny');
      queryClient.invalidateQueries(['productionGuide', guideId]);
      onClose();
    },
    onError: (err) => {
      console.error('Error adding step:', err);
      toast.error(err.response?.data?.message || 'Błąd dodawania kroku');
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm(prev => ({ ...prev, attachments: Array.from(e.target.files) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!form.title) {
      toast.error('Tytuł kroku jest wymagany');
      return;
    }
    
    mutation.mutate();
  };

  return (
    <Modal title="➕ Dodaj nowy krok" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tytuł"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />
        <Textarea
          label="Opis"
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />
        <Input
          label="Szacowany czas (minuty)"
          name="estimatedTime"
          type="number"
          value={form.estimatedTime}
          onChange={handleChange}
          min="1"
        />
        <SelectRole
          label="Przypisana rola"
          value={form.assignedToRole}
          onChange={(value) => setForm(prev => ({ ...prev, assignedToRole: value }))}
          includeEmpty
        />
        <div>
          <label className="block font-medium mb-1">Załączniki (opcjonalne)</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full"
          />
          {form.attachments.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Wybrano {form.attachments.length} {form.attachments.length === 1 ? 'plik' : 'plików'}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mr-2 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={mutation.isLoading || !form.title}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isLoading ? 'Dodawanie...' : 'Dodaj krok'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddStepModal;