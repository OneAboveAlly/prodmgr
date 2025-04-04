import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import productionApi from '../../api/production.api';
import { useAuth } from '../../contexts/AuthContext';
import { calculateGuideStatistics } from '../../utils/productionStatsUtils';

import Spinner from '../../components/common/Spinner';
import GuideHeader from '../../components/production/GuideHeader';
import GuideStepsSection from '../../components/production/GuideStepsSection';
import AssignedUsersPanel from '../../components/production/AssignedUsersPanel';
import GuideInventoryPanel from '../../modules/production/components/GuideInventoryPanel';
import { 
  ArrowLeft, 
  Edit, 
  Clock, 
  ClipboardCheck, 
  PieChart,
  BarChart,
  Save,
  Archive,
  Calendar
} from 'lucide-react';

const ProductionGuideDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['productionGuide', id],
    queryFn: () => productionApi.getGuideById(id),
    onError: (err) => {
      console.error('Error fetching guide details:', err);
    }
  });

  if (isLoading) return <Spinner label="Loading guide..." />;
  
  if (isError) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-red-100 text-red-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold">❌ Error:</h2>
        <p>{error?.message || 'Unable to fetch guide data'}</p>
      </div>
      <button 
        onClick={() => navigate('/production/guides')}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Back to guides list
      </button>
    </div>
  );
  
  if (!data?.guide) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold">⚠️ Notice:</h2>
        <p>No guide found with ID: {id}</p>
      </div>
      <button 
        onClick={() => navigate('/production/guides')}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Back to guides list
      </button>
    </div>
  );

  const guide = data.guide;
  
  // Calculate statistics using our utility
  const stats = calculateGuideStatistics(guide);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Navigation and Actions Bar */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => navigate('/production/guides')}
          className="flex items-center text-gray-600 hover:text-indigo-600"
        >
          <ArrowLeft size={18} className="mr-1" /> Back to Guides
        </button>
        
        <div className="flex gap-2">
          {hasPermission('production', 'update') && (
            <Link
              to={`/production/guides/edit/${guide.id}`}
              className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <Edit size={16} /> Edit Guide
            </Link>
          )}
          
          {hasPermission('production', 'update') && guide.status !== 'ARCHIVED' && (
            <button
              className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              // onClick would call the archive API
            >
              <Archive size={16} /> Archive
            </button>
          )}
          
          {hasPermission('production', 'create') && (
            <button
              className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              // onClick would call the save as template API
            >
              <Save size={16} /> Save as Template
            </button>
          )}
        </div>
      </div>

      <GuideHeader guide={guide} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Guide Metadata Panel */}
        <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
          <h3 className="font-semibold text-lg mb-3">Guide Details</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-1">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium">{guide.status}</span>
            </div>
            
            <div className="flex justify-between border-b pb-1">
              <span className="text-gray-600">Priority:</span>
              <span className="font-medium">{guide.priority}</span>
            </div>
            
            <div className="flex justify-between border-b pb-1">
              <span className="text-gray-600">Barcode:</span>
              <span className="font-mono text-sm">{guide.barcode}</span>
            </div>
            
            <div className="flex justify-between border-b pb-1">
              <span className="text-gray-600">Created:</span>
              <span>{formatDate(guide.createdAt)}</span>
            </div>
            
            {guide.dueDate && (
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-600">Due Date:</span>
                <span className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {formatDate(guide.dueDate)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Panel */}
        <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
          <h3 className="font-semibold text-lg mb-3 flex items-center">
            <PieChart size={18} className="mr-2 text-indigo-600" />
            Statistics
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-500">Step Progress</h4>
              <div className="flex items-center">
                <ClipboardCheck size={16} className="mr-1 text-green-600" />
                <span className="font-medium">{stats.steps.completed}/{stats.steps.total} Steps</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${stats.steps.total ? (stats.steps.completed / stats.steps.total) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Pending: {stats.steps.pending}</span>
                <span>In Progress: {stats.steps.inProgress}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-gray-500">Time Tracking</h4>
              <div className="flex items-center">
                <Clock size={16} className="mr-1 text-blue-600" />
                <span className="font-medium">{stats.time.totalActualTime}/{stats.time.totalEstimatedTime} minutes</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${stats.time.progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500">
                Progress: {Math.round(stats.time.progress)}%
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-2 border-t">
            <Link 
              to={`/production/guides/${id}/manual-work`} 
              className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              Log Work Time
            </Link>
          </div>
        </div>
      </div>

      <GuideStepsSection steps={guide.steps || []} guideId={guide.id} />

      {/* Add the Inventory Panel */}
      {hasPermission('inventory', 'read') && (
        <GuideInventoryPanel guideId={guide.id} />
      )}

      <AssignedUsersPanel guideId={guide.id} />
    </div>
  );
};

export default ProductionGuideDetailsPage;