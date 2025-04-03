// src/pages/production/ManualWorkEntryPanel.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import productionApi from '../../api/production.api';
import { toast } from 'react-toastify';
import Spinner from "../../components/common/Spinner";
import Button from "../../components/common/Button";
import Textarea from "../../components/common/Textarea";
import Input from '../../components/common/Input';

const ManualWorkEntryPanel = () => {
  const { id: guideId } = useParams();
  const navigate = useNavigate();
  const [durationMinutes, setDurationMinutes] = useState('');
  const [note, setNote] = useState('');

  const { isLoading: isGuideLoading, data: guideData, error: guideError } = useQuery({
    queryKey: ['productionGuide', guideId],
    queryFn: () => productionApi.getGuideById(guideId),
    onError: (err) => {
      toast.error('Błąd pobierania danych przewodnika');
      console.error('Error loading guide:', err);
    }
  });

  const mutation = useMutation({
    mutationFn: (data) => productionApi.submitManualWork(guideId, data),
    onSuccess: () => {
      toast.success('Czas pracy dodany');
      setDurationMinutes('');
      setNote('');
      // Optionally redirect back to guide details
      navigate(`/production/guides/${guideId}`);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Błąd dodawania czasu');
      console.error('Error submitting work:', error);
    }
  });

  const handleSubmit = () => {
    if (!durationMinutes || parseInt(durationMinutes) <= 0) {
      toast.error('Czas pracy musi być większy od 0');
      return;
    }

    mutation.mutate({
      durationMinutes: parseInt(durationMinutes),
      note: note || undefined
    });
  };

  if (isGuideLoading) return <Spinner />;
  if (guideError) return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-red-100 text-red-800 p-4 rounded-lg">
        Nie można załadować przewodnika. Spróbuj ponownie później.
      </div>
      <Button className="mt-4" onClick={() => navigate('/production/guides')}>
        Wróć do listy przewodników
      </Button>
    </div>
  );
  
  if (!guideData || !guideData.guide) return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg">
        Nie znaleziono przewodnika o ID: {guideId}
      </div>
      <Button className="mt-4" onClick={() => navigate('/production/guides')}>
        Wróć do listy przewodników
      </Button>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">
        Wpisz czas pracy dla przewodnika: {guideData.guide.title}
      </h2>

      <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
        <Input
          label="Czas pracy (minuty)"
          type="number"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          min={1}
          required
        />

        <Textarea
          label="Notatka (opcjonalnie)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
        />

        <div className="flex space-x-3">
          <Button
            onClick={handleSubmit}
            disabled={mutation.isLoading || !durationMinutes || parseInt(durationMinutes) <= 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {mutation.isLoading ? 'Zapisuję...' : 'Zapisz czas'}
          </Button>

          <Button
            onClick={() => navigate(`/production/guides/${guideId}`)}
            className="bg-gray-500 hover:bg-gray-600"
          >
            Anuluj
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManualWorkEntryPanel;