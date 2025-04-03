import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProductionPage = () => {
  const { hasPermission } = useAuth();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🛠️ Moduł Produkcji</h1>
      <p className="mb-6 text-gray-600">Witaj w centrum zarządzania produkcją. Wybierz jedną z dostępnych akcji:</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {hasPermission('production', 'view') && (
          <Link
            to="/production/guides"
            className="bg-white p-4 rounded shadow hover:shadow-md border border-gray-200 hover:border-indigo-500 transition"
          >
            📋 Lista przewodników
          </Link>
        )}
        {hasPermission('production', 'create') && (
          <Link
            to="/production/guides/new"
            className="bg-white p-4 rounded shadow hover:shadow-md border border-gray-200 hover:border-indigo-500 transition"
          >
            ➕ Utwórz przewodnik
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductionPage;
