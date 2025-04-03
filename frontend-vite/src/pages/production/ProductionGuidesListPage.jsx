import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import productionApi from '../../api/production.api';
import Spinner from '../../components/common/Spinner';
import { formatDateTime } from '../../utils/dateUtils';
import { Plus, Search, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ProductionGuidesListPage = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['production-guides', searchTerm, priorityFilter, statusFilter],
    queryFn: () => productionApi.getAllGuides(),
    onError: (err) => {
      console.error('Error fetching guides:', err);
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setPriorityFilter('');
    setStatusFilter('');
  };

  if (isLoading) return <Spinner label="Ładowanie przewodników..." />;
  
  if (isError) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-red-100 text-red-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold">❌ Błąd:</h2>
        <p>{error?.message || 'Nie można pobrać listy przewodników'}</p>
      </div>
      <button 
        onClick={() => refetch()}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Spróbuj ponownie
      </button>
    </div>
  );

  const { guides = [], stats = {} } = data || {};

  // Filter guides based on search term and filters
  const filteredGuides = guides.filter(guide => {
    const matchesSearch = !searchTerm || 
      guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (guide.description && guide.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (guide.barcode && guide.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesPriority = !priorityFilter || guide.priority === priorityFilter;
    const matchesStatus = !statusFilter || guide.status === statusFilter;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-700';
      case 'LOW': return 'bg-gray-100 text-gray-600';
      default: return 'bg-indigo-100 text-indigo-700';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Przewodniki produkcyjne</h1>
        {hasPermission('production', 'create') && (
          <Link
            to="/production/guides/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow"
          >
            <Plus size={18} /> Dodaj nowy
          </Link>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center flex-1">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Szukaj według tytułu, opisu lub kodu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-l px-4 py-2 pr-10"
              />
              <button 
                type="submit"
                className="absolute right-0 top-0 h-full px-3 bg-indigo-600 rounded-r text-white"
              >
                <Search size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2"
            >
              <option value="">Wszystkie priorytety</option>
              <option value="NORMAL">Normalny</option>
              <option value="CRITICAL">Krytyczny</option>
              <option value="LOW">Niski</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2"
            >
              <option value="">Wszystkie statusy</option>
              <option value="DRAFT">Szkic</option>
              <option value="IN_PROGRESS">W toku</option>
              <option value="COMPLETED">Zakończony</option>
              <option value="CANCELLED">Anulowany</option>
            </select>
            
            <button
              type="button"
              onClick={resetFilters}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Wyczyść
            </button>
          </div>
        </form>
      </div>

      {filteredGuides.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow">
          <p className="text-gray-600 mb-4">Nie znaleziono przewodników spełniających kryteria.</p>
          <button
            onClick={resetFilters}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Pokaż wszystkie przewodniki
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white shadow rounded-xl p-4 border border-gray-200 hover:border-indigo-400 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold text-lg text-gray-800">
                    <Link to={`/production/guides/${guide.id}`} className="hover:text-indigo-600 transition">
                      {guide.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-gray-600 line-clamp-2">{guide.description || 'Brak opisu'}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(guide.priority)}`}>
                  {guide.priority}
                </span>
              </div>

              <div className="mt-3 text-sm text-gray-500">
                <div className="flex justify-between items-center mb-1">
                  <span>Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(guide.status)}`}>
                    {guide.status}
                  </span>
                </div>
                <p>Kod: <code className="bg-gray-100 px-1 py-0.5 rounded">{guide.barcode || '—'}</code></p>
                <p>Dodano: {formatDateTime(guide.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-2">📊 Statystyki przewodników</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-indigo-50 p-3 rounded">
            <div className="text-sm text-gray-600">Wszystkie</div>
            <div className="text-xl font-semibold">{stats.totalGuides || 0}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded">
            <div className="text-sm text-gray-600">W toku</div>
            <div className="text-xl font-semibold">{stats.inProgress || 0}</div>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-gray-600">Zakończone</div>
            <div className="text-xl font-semibold">{stats.completed || 0}</div>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <div className="text-sm text-gray-600">Krytyczne</div>
            <div className="text-xl font-semibold">{stats.critical || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionGuidesListPage;