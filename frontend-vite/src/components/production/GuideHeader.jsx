import React from 'react';
import { formatDateTime } from '@/utils/dateUtils';
import { BadgeCheck, Barcode, User, Clock } from 'lucide-react';
import clsx from 'clsx';

const statusColors = {
  DRAFT: 'bg-gray-200 text-gray-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const priorityColors = {
  NORMAL: 'bg-blue-100 text-blue-700',
  CRITICAL: 'bg-red-100 text-red-700',
  LOW: 'bg-gray-100 text-gray-600',
};

const GuideHeader = ({ guide }) => {
  if (!guide) return null;

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{guide.title}</h1>
          <p className="text-sm text-gray-500">{guide.description}</p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', statusColors[guide.status])}>
            {guide.status}
          </span>
          <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold', priorityColors[guide.priority])}>
            {guide.priority}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full inline-flex items-center gap-1">
            <Barcode size={14} /> {guide.barcode}
          </span>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <User size={16} />
          <span>
            Utworzył: {guide.createdBy.firstName} {guide.createdBy.lastName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} />
          <span>Dodano: {formatDateTime(guide.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default GuideHeader;
