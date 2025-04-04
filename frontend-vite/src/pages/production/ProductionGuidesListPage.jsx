import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import productionApi from '../../api/production.api';
import Spinner from '../../components/common/Spinner';
import { formatDateTime } from '../../utils/dateUtils';
import { 
  Plus, 
  Search, 
  Filter, 
  Archive,
  ArchiveRestore,
  CheckSquare,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ArchiveGuideModal from '../../components/production/ArchiveGuideModal';
import { canArchiveGuide } from '../../utils/guideArchiveUtils';
import { useMutation } from '@tanstack/react-query';
import { restoreGuide } from '../../utils/guideArchiveUtils';

const ProductionGuidesListPage = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  // State for filtering and UI
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [guideToArchive, setGuideToArchive] = useState(null);
  
  // Restore guide mutation
  const restoreMutation = useMutation({
    mutationFn: (guideId) => restoreGuide(guideId),
    onSuccess: () => {
      queryClient.invalidateQueries(['productionGuides']);
    }
  });

  // Fetch guides
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['productionGuides', showArchived],
    queryFn: () => productionApi.getAllGuides({ archived: showArchived }),
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
  
  const handleArchiveClick = (guide) => {
    setGuideToArchive(guide);
  };
  
  const handleRestoreGuide = (guideId) => {
    if (window.confirm('Are you sure you want to restore this guide?')) {
      restoreMutation.mutate(guideId);
    }
  };

  if (isLoading) return <Spinner label="Loading guides..." />;
  
  if (isError) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-red-100 text-red-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold">❌ Error:</h2>
        <p>{error?.message || 'Unable to fetch guides'}</p>
      </div>
      <button 
        onClick={() => refetch()}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Try Again
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
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-gray-100 text-gray-600';
      default: return 'bg-indigo-100 text-indigo-700'; // Default for NORMAL
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-blue-100 text-blue-600'; // Default for DRAFT
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {showArchived ? 'Archived Guides' : 'Production Guides'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1 px-4 py-2 rounded ${
              showArchived 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {showArchived ? (
              <>
                <ArchiveRestore size={18} />
                Show Active Guides
              </>
            ) : (
              <>
                <Archive size={18} />
                View Archives
              </>
            )}
          </button>
          
          {!showArchived && hasPermission('production', 'create') && (
            <Link
              to="/production/guides/new"
              className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow"
            >
              <Plus size={18} /> New Guide
            </Link>
          )}
          
          {!showArchived && hasPermission('production', 'view') && (
            <Link
              to="/production/templates"
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
            >
              <CheckSquare size={18} /> Templates
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center flex-1">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by title, description or code..."
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
              <option value="">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded px-4 py-2"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              {showArchived && <option value="ARCHIVED">Archived</option>}
            </select>
            
            <button
              type="button"
              onClick={resetFilters}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {filteredGuides.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow">
          <p className="text-gray-600 mb-4">No guides found matching your criteria.</p>
          <button
            onClick={resetFilters}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Show All Guides
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
                  <p className="text-sm text-gray-600 line-clamp-2">{guide.description || 'No description'}</p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityColor(guide.priority)}`}>
                    {guide.priority}
                  </span>
                  <span className={`mt-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(guide.status)}`}>
                    {guide.status}
                  </span>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-500">
                <div className="flex justify-between items-center mb-1">
                  <span>Barcode:</span>
                  <code className="bg-gray-100 px-1 py-0.5 rounded">{guide.barcode || '—'}</code>
                </div>
                <p>Created: {formatDateTime(guide.createdAt)}</p>
                {guide.dueDate && <p>Due: {formatDateTime(guide.dueDate)}</p>}
              </div>
              
              <div className="mt-3 flex justify-end gap-2">
                <Link
                  to={`/production/guides/${guide.id}`}
                  className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                >
                  <Eye size={16} />
                  View
                </Link>
                
                {guide.status === 'ARCHIVED' && hasPermission('production', 'update') ? (
                  <button
                    onClick={() => handleRestoreGuide(guide.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    disabled={restoreMutation.isLoading}
                  >
                    <ArchiveRestore size={16} />
                    Restore
                  </button>
                ) : (
                  hasPermission('production', 'update') && 
                  canArchiveGuide(guide) && (
                    <button
                      onClick={() => handleArchiveClick(guide)}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      <Archive size={16} />
                      Archive
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!showArchived && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">📊 Guide Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-indigo-50 p-3 rounded">
              <div className="text-sm text-gray-600">All</div>
              <div className="text-xl font-semibold">{stats.totalGuides || 0}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-sm text-gray-600">In Progress</div>
              <div className="text-xl font-semibold">{stats.inProgress || 0}</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-xl font-semibold">{stats.completed || 0}</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-sm text-gray-600">Critical</div>
              <div className="text-xl font-semibold">{stats.critical || 0}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Archive Guide Modal */}
      {guideToArchive && (
        <ArchiveGuideModal 
          guide={guideToArchive} 
          onClose={() => setGuideToArchive(null)} 
        />
      )}
    </div>
  );
};

export default ProductionGuidesListPage;