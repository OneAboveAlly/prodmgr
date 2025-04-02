import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">🚫 Brak dostępu</h1>
      <p className="mb-4 text-gray-700">Nie masz odpowiednich uprawnień, by zobaczyć tę stronę.</p>
      <button
        onClick={() => navigate(-1)}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        ⬅️ Wróć
      </button>
    </div>
  );
}
