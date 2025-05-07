import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api.service';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

// Dashboard component icons
import { UserIcon, BuildingStorefrontIcon, CakeIcon, ChartBarIcon, 
  ListBulletIcon, ClockIcon, DocumentTextIcon, TruckIcon, 
  ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user, hasPermission } = useAuth();
  const [timeRange, setTimeRange] = useState('month'); // week, month, quarter, year
  
  // Fetch dashboard stats - poprawiony URL API
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats', timeRange],
    queryFn: async () => {
      try {
        const response = await api.get('/dashboard/stats', { params: { range: timeRange }});
        return response.data;
      } catch (error) {
        console.error('Błąd pobierania danych dashboardu:', error);
        // Zwracamy domyślne dane w przypadku błędu
        return getDefaultData();
      }
    },
    staleTime: 1000 * 60 * 5 // 5 minut
  });
  
  // Fetch production requirements
  const { data: productionRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['production-requests'],
    queryFn: async () => {
      try {
        // Pobieramy zarówno przedmioty potrzebne jak i zarezerwowane
        const response = await api.get('/inventory/production-requests', { 
          params: { 
            status: ['NEEDED', 'RESERVED'],
            limit: 15 
          } 
        });
        return response.data;
      } catch (error) {
        console.error('Błąd pobierania zapotrzebowań produkcyjnych:', error);
        return { requests: [], stats: { counts: { NEEDED: 0, RESERVED: 0, ISSUED: 0 }, total: 0 } };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minut
    enabled: hasPermission('inventory', 'read')
  });
  
  // Fetch birthdays for today
  const { data: birthdaysData, isLoading: birthdaysLoading } = useQuery({
    queryKey: ['today-birthdays'],
    queryFn: async () => {
      try {
        const response = await api.get('/users/birthdays/today');
        return response.data;
      } catch (error) {
        console.error('Błąd pobierania danych urodzin:', error);
        return { users: [] };
      }
    },
    staleTime: 1000 * 60 * 60 // 1 godzina
  });
  
  // Funkcja do dostarczania domyślnych danych w przypadku błędu API
  const getDefaultData = () => {
    return {
      activeUsers: 0,
      totalProjects: 0,
      openTasks: 0,
      completedTasks: 0,
      taskStatusData: [
        { name: 'Zakończone', value: 0 },
        { name: 'W trakcie', value: 0 },
        { name: 'Oczekujące', value: 0 }
      ],
      projectProgress: [],
      recentActivity: [],
      resourceUtilization: [],
      inventoryAlerts: [],
      upcomingDeadlines: [],
      productivityData: [
        { date: '2023-01', productivity: 0 },
        { date: '2023-02', productivity: 0 },
        { date: '2023-03', productivity: 0 },
        { date: '2023-04', productivity: 0 },
        { date: '2023-05', productivity: 0 },
        { date: '2023-06', productivity: 0 }
      ]
    };
  };
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#EA5545', '#8884d8'];
  
  if (statsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Ładowanie danych dashboardu...</div>
      </div>
    );
  }
  
  // Determine which dashboard sections to show based on user roles/permissions
  const showWarehouseSection = hasPermission('inventory', 'read');
  const showProductionSection = hasPermission('production', 'view');
  const showManagementSection = hasPermission('statistics', 'read') || 
                               hasPermission('production', 'manage');
  const showExecutiveSection = hasPermission('statistics', 'viewReports') || 
                               user?.roles?.some(role => role.name === 'CEO');
  
  // Sample productivity data for chart if real data is missing
  const productivityData = stats?.productivityData || [
    { date: 'Sty', productivity: 68 },
    { date: 'Lut', productivity: 72 },
    { date: 'Mar', productivity: 79 },
    { date: 'Kwi', productivity: 85 },
    { date: 'Maj', productivity: 82 },
    { date: 'Cze', productivity: 88 }
  ];
  
  // Sample project completion data if real data is missing
  const projectCompletionData = [
    { month: 'Sty', completed: 5, total: 8 },
    { month: 'Lut', completed: 7, total: 10 },
    { month: 'Mar', completed: 3, total: 5 },
    { month: 'Kwi', completed: 6, total: 7 },
    { month: 'Maj', completed: 4, total: 6 },
    { month: 'Cze', completed: 8, total: 10 }
  ];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Panel kontrolny</h1>
        </div>
        
        {/* Birthdays widget - smaller and on the right */}
        <div className="w-72 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center mb-3">
            <CakeIcon className="h-5 w-5 text-indigo-500 mr-2" />
            <h2 className="text-base font-semibold">Dzisiejsze urodziny</h2>
          </div>
          
          {birthdaysLoading ? (
            <p className="text-sm text-gray-500">Ładowanie...</p>
          ) : birthdaysData?.users?.length > 0 ? (
            <div className="space-y-2">
              {birthdaysData.users.map(user => (
                <div key={user.id} className="flex items-center p-2 bg-indigo-50 rounded-md">
                  <div className="bg-indigo-100 p-1.5 rounded-full mr-2">
                    <CakeIcon className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500">Kończy {user.age} lat</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Brak urodzin na dzisiaj</p>
          )}
        </div>
      </div>
      
      {/* Time Range Selector */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button 
            className={`px-4 py-2 rounded-md ${timeRange === 'week' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeRange('week')}
          >
            Tydzień
          </button>
          <button 
            className={`px-4 py-2 rounded-md ${timeRange === 'month' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeRange('month')}
          >
            Miesiąc
          </button>
          <button 
            className={`px-4 py-2 rounded-md ${timeRange === 'quarter' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeRange('quarter')}
          >
            Kwartał
          </button>
          <button 
            className={`px-4 py-2 rounded-md ${timeRange === 'year' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setTimeRange('year')}
          >
            Rok
          </button>
        </div>
      </div>
      
      {/* Basic Stats Cards - visible to all users */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-500">
              <UserIcon className="w-8 h-8" />
            </div>
            <div className="ml-5">
              <p className="text-gray-500">Aktywni użytkownicy</p>
              <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-500">
              <DocumentTextIcon className="w-8 h-8" />
            </div>
            <div className="ml-5">
              <p className="text-gray-500">Projekty</p>
              <p className="text-2xl font-bold">{stats?.totalProjects || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-500">
              <ClockIcon className="w-8 h-8" />
            </div>
            <div className="ml-5">
              <p className="text-gray-500">Otwarte zadania</p>
              <p className="text-2xl font-bold">{stats?.openTasks || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-500">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <div className="ml-5">
              <p className="text-gray-500">Zakończone zadania</p>
              <p className="text-2xl font-bold">{stats?.completedTasks || 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Warehouse Manager Section */}
      {showWarehouseSection && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <BuildingStorefrontIcon className="h-6 w-6 mr-2 text-gray-600" />
            Zarządzanie magazynem
          </h2>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Alerty niskiego stanu</h3>
            {stats?.inventoryAlerts?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Przedmiot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktualna ilość</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Minimalna ilość</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.inventoryAlerts.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{item.item}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.minQuantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            Niski stan
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Brak alertów niskiego stanu</p>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Oczekujące zapotrzebowania produkcyjne</h3>
            <p className="text-gray-500">Przedmioty potrzebne i zarezerwowane do produkcji</p>
            
            {requestsLoading ? (
              <div className="mt-4 text-center py-4">
                <p className="text-gray-500">Ładowanie zapotrzebowań...</p>
              </div>
            ) : productionRequests?.requests?.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Przedmiot</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ilość</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Przewodnik</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Krok</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorytet</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productionRequests.requests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{request.item.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {request.quantity} {request.item.unit}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {request.step.guide.title}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {request.step.title}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.status === 'NEEDED' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {request.status === 'NEEDED' ? 'Potrzebny' : 'Zarezerwowany'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.step.guide.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            request.step.guide.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            request.step.guide.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {request.step.guide.priority === 'CRITICAL' ? 'Krytyczny' :
                             request.step.guide.priority === 'HIGH' ? 'Wysoki' :
                             request.step.guide.priority === 'NORMAL' ? 'Normalny' : 
                             'Niski'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-center text-gray-400">Brak oczekujących zapotrzebowań produkcyjnych</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Production Worker Section */}
      {showProductionSection && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <TruckIcon className="h-6 w-6 mr-2 text-gray-600" />
            Przegląd produkcji
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Postęp projektów</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats?.projectProgress || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Zakończone" stackId="a" fill="#4F46E5" />
                  <Bar dataKey="remaining" name="Pozostałe" stackId="a" fill="#E5E7EB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Nadchodzące terminy</h3>
              <div className="space-y-4">
                {stats?.upcomingDeadlines?.length > 0 ? (
                  stats.upcomingDeadlines.map((deadline, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{deadline.project}</p>
                        <p className="text-sm text-gray-500">Termin: {new Date(deadline.deadline).toLocaleDateString()}</p>
                      </div>
                      <div className={`text-sm font-semibold rounded-full px-3 py-1 ${
                        deadline.daysLeft <= 7 ? 'bg-red-100 text-red-800' : 
                        deadline.daysLeft <= 14 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {deadline.daysLeft} dni
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Brak nadchodzących terminów</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Management Section - For managers */}
      {showManagementSection && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <ListBulletIcon className="h-6 w-6 mr-2 text-gray-600" />
            Przegląd zarządzania
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Status zadań</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats?.taskStatusData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats?.taskStatusData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Wykorzystanie zasobów</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={stats?.resourceUtilization || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usage" name="Wykorzystanie (%)" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      
      {/* Executive Section - For CEO and top management */}
      {showExecutiveSection && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2 text-gray-600" />
            Panel zarządu
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Trendy produktywności</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={productivityData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="productivity" name="Produktywność" stroke="#4F46E5" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Wskaźnik ukończenia projektów</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={projectCompletionData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="total" name="Wszystkie" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="completed" name="Ukończone" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Activity Section - visible to all users */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Ostatnia aktywność</h2>
        {stats?.recentActivity?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Użytkownik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcja</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Element</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Czas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentActivity.map((activity, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">{activity.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{activity.action}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{activity.target}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{activity.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">Brak ostatnich aktywności</p>
        )}
      </div>
      
      {statsError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 mt-4">
          <p className="font-medium">Uwaga: Niektóre dane mogą być niedostępne</p>
          <p className="text-sm">Wystąpił problem z ładowaniem pełnych danych panelu. Niektóre wykresy mogą pokazywać dane przykładowe.</p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;