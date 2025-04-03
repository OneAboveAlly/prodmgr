import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import productionApi from '../../api/production.api';

import Spinner from '../../components/common/Spinner';
import GuideHeader from '../../components/production/GuideHeader';
import GuideStepsSection from '../../components/production/GuideStepsSection';
import AssignedUsersPanel from '../../components/production/AssignedUsersPanel';
import { Link } from 'react-router-dom';

const ProductionGuideDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['productionGuide', id],
    queryFn: () => productionApi.getGuideById(id),
    onError: (err) => {
      console.error('Error fetching guide details:', err);
    }
  });

  if (isLoading) return <Spinner label="Ładowanie przewodnika..." />;
  
  if (isError) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-red-100 text-red-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold">❌ Błąd:</h2>
        <p>{error?.message || 'Nie można pobrać danych przewodnika'}</p>
      </div>
      <button 
        onClick={() => navigate('/production/guides')}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Wróć do listy przewodników
      </button>
    </div>
  );
  
  if (!data?.guide) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold">⚠️ Uwaga:</h2>
        <p>Nie znaleziono przewodnika o ID: {id}</p>
      </div>
      <button 
        onClick={() => navigate('/production/guides')}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Wróć do listy przewodników
      </button>
    </div>
  );

  const guide = data.guide;
  const stats = data.stats || { steps: {}, time: {} };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <GuideHeader guide={guide} />

      <GuideStepsSection steps={guide.steps || []} guideId={guide.id} />

      <AssignedUsersPanel guideId={guide.id} />

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-lg mb-2">Ewidencja czasu pracy</h3>
        <Link 
          to={`/production/guides/${id}/manual-work`} 
          className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        >
          Zapisz czas pracy
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-lg mb-2">Statystyki czasu</h3>
        <p>Szacowany czas: <strong>{stats.time?.totalEstimatedTime ?? '—'} min</strong></p>
        <p>Rzeczywisty czas: <strong>{stats.time?.totalActualTime ?? '—'} min</strong></p>
        <p>Postęp: <strong>{stats.time?.progress ? `${stats.time.progress.toFixed(1)}%` : '0.0%'}</strong></p>

        <div className="mt-3">
          <h4 className="font-medium mb-1">Kroki produkcyjne:</h4>
          <p>Wszystkie: <strong>{stats.steps?.total ?? 0}</strong></p>
          <p>Ukończone: <strong>{stats.steps?.completed ?? 0}</strong></p>
          <p>W realizacji: <strong>{stats.steps?.inProgress ?? 0}</strong></p>
          <p>Oczekujące: <strong>{stats.steps?.pending ?? 0}</strong></p>
        </div>
      </div>
    </div>
  );
};

export default ProductionGuideDetailsPage;