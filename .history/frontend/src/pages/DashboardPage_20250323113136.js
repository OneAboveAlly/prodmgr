import React from 'react';
import MainLayout from '../components/layout/MainLayout';

function DashboardPage() {
  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Panel główny</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-medium mb-2">Otwarte zlecenia</h2>
            <p className="text-3xl font-bold">0</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-medium mb-2">Zgłoszenia jakości</h2>
            <p className="text-3xl font-bold">0</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-medium mb-2">Moje zadania</h2>
            <p className="text-3xl font-bold">0</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-medium mb-2">Alerty magazynowe</h2>
            <p className="text-3xl font-bold">0</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default DashboardPage;