import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api.service';
import { TrashIcon, CheckIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import InventoryItemSelector from './InventoryItemSelector';
import InventoryTableView from './InventoryTableView';
import { useAuth } from '../../contexts/AuthContext';

const GuideInventorySection = ({ guideId, isUserAssigned = false, canEdit = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Pobieranie przedmiotów dla przewodnika
  const { data: inventoryItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['guideInventory', guideId],
    queryFn: async () => {
      const response = await api.get(`/inventory/guides/${guideId}/items`);
      console.log('Inventory items:', response.data.items);
      return response.data.items || [];
    },
    onSuccess: (data) => {
      if (isEditing) {
        const formattedItems = data.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity,
          item: {
            name: item.item.name,
            unit: item.item.unit
          }
        }));
        setSelectedItems(formattedItems);
      }
    }
  });

  // Mutacja do aktualizacji przedmiotów
  const updateInventoryMutation = useMutation({
    mutationFn: async (items) => {
      return await api.post(`/inventory/guides/${guideId}/items`, { items });
    },
    onSuccess: () => {
      toast.success('Przedmioty magazynowe zaktualizowane pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['guideInventory', guideId] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Błąd podczas aktualizacji przedmiotów: ${error.message}`);
    }
  });

  // Mutacja do pobrania zarezerwowanych przedmiotów
  const withdrawItemsMutation = useMutation({
    mutationFn: async (items) => {
      // Używamy poprawnego endpointu z controllera produkcji
      return await api.post(`/production/guides/${guideId}/withdraw-items`, { items });
    },
    onSuccess: (response) => {
      // Poprawnie odczytujemy odpowiedź z API
      const data = response.data || {};
      const results = data.results || [];
      const errors = data.errors || [];
      
      if (results.length > 0) {
        toast.success(`Pobrano ${results.length} przedmiotów z magazynu`);
        
        // Wyświetl szczegóły pobranych przedmiotów
        results.forEach(result => {
          const itemName = result.item?.name || 'przedmiot';
          const quantity = result.quantity || 0;
          const unit = result.item?.unit || '';
          
          toast.info(`Pobrano: ${quantity} ${unit} - ${itemName}`, {
            autoClose: 3000
          });
        });
      }
      
      if (errors.length > 0) {
        // Pokaż błędy dla konkretnych przedmiotów
        errors.forEach(error => {
          toast.warning(`Błąd: ${error.error}`, {
            autoClose: 5000
          });
        });
      }
      
      // Odśwież dane
      queryClient.invalidateQueries({ queryKey: ['guideInventory', guideId] });
      
      // Odśwież również stan magazynu, ponieważ zostały wydane przedmioty
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
    },
    onError: (error) => {
      toast.error(`Błąd podczas pobierania przedmiotów: ${error.message}`);
    }
  });

  // Obsługa edycji przedmiotów
  const handleItemsChange = (items) => {
    setSelectedItems(items);
  };

  // Zapisywanie zmian
  const handleSaveChanges = () => {
    const itemsToUpdate = selectedItems.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity
    }));
    
    updateInventoryMutation.mutate(itemsToUpdate);
  };

  // Anulowanie edycji
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Pobieranie przedmiotów z magazynu
  const handleWithdrawItems = (item) => {
    // Sprawdź, czy przedmiot jest już pobrany
    if (!item.reserved) {
      toast.info('Ten przedmiot został już pobrany');
      return;
    }
    
    // Sprawdź, czy użytkownik jest przypisany do przewodnika
    if (!isUserAssigned) {
      toast.warning('Musisz być przypisany do przewodnika, aby pobrać przedmioty');
      return;
    }
    
    const itemsToWithdraw = [{
      itemId: item.itemId,
      quantity: item.quantity
    }];
    
    // Dodanie potwierdzenia przed pobraniem
    if (window.confirm(`Czy na pewno chcesz pobrać ${item.quantity} ${item.item.unit} przedmiotu "${item.item.name}"?`)) {
      withdrawItemsMutation.mutate(itemsToWithdraw);
    }
  };

  // Pobieranie wszystkich przedmiotów
  const handleWithdrawAllItems = () => {
    // Filtruj tylko zarezerwowane przedmioty, które można pobrać
    const itemsToWithdraw = inventoryItems
      .filter(item => item.reserved)
      .map(item => ({
        itemId: item.itemId,
        quantity: item.quantity
      }));
    
    if (itemsToWithdraw.length === 0) {
      toast.info('Brak przedmiotów do pobrania');
      return;
    }
    
    // Potwierdzenie przed pobraniem wszystkich przedmiotów
    if (window.confirm(`Czy na pewno chcesz pobrać wszystkie przedmioty (${itemsToWithdraw.length}) z magazynu?`)) {
      withdrawItemsMutation.mutate(itemsToWithdraw);
    }
  };

  // Formatowanie informacji o użytkowniku, który pobrał przedmiot
  const formatWithdrawnInfo = (item) => {
    if (!item.withdrawnBy) return '-';
    
    const userName = `${item.withdrawnBy.firstName} ${item.withdrawnBy.lastName}`;
    const withdrawnTime = item.withdrawnDate ? new Date(item.withdrawnDate).toLocaleString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }) : '';
    
    // Podświetl, jeśli to aktualny użytkownik
    if (user && item.withdrawnById === user.id) {
      return (
        <div>
          <span className="font-medium text-green-600">
            {userName} (Ty)
          </span>
          {withdrawnTime && (
            <div className="text-xs text-gray-500 mt-1">
              {withdrawnTime}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div>
        <span>{userName}</span>
        {withdrawnTime && (
          <div className="text-xs text-gray-500 mt-1">
            {withdrawnTime}
          </div>
        )}
      </div>
    );
  };

  // Sprawdź, czy przedmiot został pobrany przez aktualnego użytkownika
  const isWithdrawnByMe = (item) => {
    return user && item.withdrawnById === user.id;
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Błąd ładowania przedmiotów: {error.message}
        <button 
          onClick={() => refetch()} 
          className="ml-2 text-indigo-600 hover:text-indigo-800"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // Tryb edycji
  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Edytuj przedmioty magazynowe</h3>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              disabled={updateInventoryMutation.isLoading}
            >
              {updateInventoryMutation.isLoading ? (
                <span className="animate-spin h-4 w-4 mr-1 border-2 border-white rounded-full border-t-transparent"></span>
              ) : (
                <CheckIcon className="h-4 w-4 mr-1" />
              )}
              Zapisz zmiany
            </button>
          </div>
        </div>
        
        <InventoryItemSelector
          selectedItems={selectedItems}
          onItemsChange={handleItemsChange}
          readOnly={false}
        />
      </div>
    );
  }

  // Tryb wyświetlania
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Przedmioty magazynowe</h3>
        <div className="flex space-x-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Edytuj listę
            </button>
          )}
          {isUserAssigned && (
            <button
              type="button"
              onClick={handleWithdrawAllItems}
              className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              disabled={withdrawItemsMutation.isLoading || inventoryItems.filter(item => item.reserved).length === 0}
            >
              {withdrawItemsMutation.isLoading ? (
                <span className="animate-spin h-4 w-4 mr-1 border-2 border-white rounded-full border-t-transparent"></span>
              ) : (
                <PlusIcon className="h-4 w-4 mr-1" />
              )}
              Pobierz wszystkie
            </button>
          )}
        </div>
      </div>
      
      {inventoryItems.length === 0 ? (
        <p className="text-gray-500 italic">Brak przypisanych przedmiotów magazynowych</p>
      ) : (
        <div className="border rounded">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nazwa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kod kreskowy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ilość
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pobrał
                  </th>
                  {isUserAssigned && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcje
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventoryItems.map((item) => (
                  <tr key={`${item.itemId}-${item.id}`} className={!item.reserved && isWithdrawnByMe(item) ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.item.barcode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity} {item.item.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.reserved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Zarezerwowany
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Pobrany
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatWithdrawnInfo(item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isUserAssigned && item.reserved ? (
                        <button
                          type="button"
                          onClick={() => handleWithdrawItems(item)}
                          className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-md hover:shadow-sm transition-all duration-150 flex items-center justify-center space-x-1"
                          disabled={withdrawItemsMutation.isLoading}
                        >
                          {withdrawItemsMutation.isLoading ? (
                            <>
                              <span className="animate-spin h-4 w-4 border-2 border-green-700 rounded-full border-t-transparent"></span>
                              <span>Pobieranie...</span>
                            </>
                          ) : (
                            <span>Pobierz</span>
                          )}
                        </button>
                      ) : !item.reserved ? (
                        <span className="inline-block px-3 py-1.5 text-sm text-gray-500 bg-gray-50 rounded-md">
                          {isWithdrawnByMe(item) ? (
                            <span className="text-green-600">Pobrane przez Ciebie</span>
                          ) : (
                            <span>Pobrane przez: {item.withdrawnBy ? `${item.withdrawnBy.firstName} ${item.withdrawnBy.lastName}` : 'nieznany'}</span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1.5 text-sm text-gray-400">
                          Brak dostępu
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Wyjaśnienie dla użytkownika */}
      {inventoryItems.length > 0 && (
        <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-700 border border-blue-100">
          <p className="font-medium mb-1">Jak działa pobieranie przedmiotów:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Przedmioty są najpierw zarezerwowane dla przewodnika produkcyjnego.</li>
            <li>Tylko osoby przypisane do przewodnika mogą pobierać zarezerwowane przedmioty.</li>
            <li>Po pobraniu przedmiotu, jego status zmienia się na "Pobrany" i jest zapisywane kto dokonał pobrania.</li>
            <li>Pobranie przedmiotu oznacza fizyczne wydanie go z magazynu i zmniejsza stan magazynowy.</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default GuideInventorySection; 