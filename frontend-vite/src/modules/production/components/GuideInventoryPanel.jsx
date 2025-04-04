import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Package, RotateCcw } from 'lucide-react';
import productionApi from '../../../api/production.api';
import inventoryApi from '../../../api/inventory.api';
import Spinner from '../../../components/common/Spinner';
import { toast } from 'react-toastify';

const GuideInventoryPanel = ({ guideId }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const queryClient = useQueryClient();

  // Fetch inventory items assigned to this guide
  const { 
    data: guideInventory, 
    isLoading: isLoadingGuideInventory,
    isError: isGuideInventoryError,
    error: guideInventoryError
  } = useQuery({
    queryKey: ['guideInventory', guideId],
    queryFn: () => productionApi.getGuideInventory(guideId),
    enabled: !!guideId,
  });

  // Fetch all available inventory items when adding new items
  const {
    data: inventoryItems,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
  } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => inventoryApi.getAllItems(),
    enabled: isAdding,
  });

  // Mutation for adding inventory items to the guide
  const addItemsMutation = useMutation({
    mutationFn: (items) => productionApi.addInventoryToGuide(guideId, items),
    onSuccess: () => {
      toast.success('Inventory items added successfully');
      setIsAdding(false);
      setSelectedItems([]);
      queryClient.invalidateQueries(['guideInventory', guideId]);
    },
    onError: (error) => {
      toast.error(`Error adding inventory items: ${error.message}`);
    },
  });

  // Handle adding items to the selection
  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    const quantity = 1; // Default quantity
    
    // Check if item is already selected
    if (selectedItems.some(item => item.itemId === itemId)) {
      return;
    }

    setSelectedItems([...selectedItems, { itemId, quantity }]);
  };

  // Handle quantity change for a selected item
  const handleQuantityChange = (itemId, quantity) => {
    setSelectedItems(selectedItems.map(item => 
      item.itemId === itemId ? { ...item, quantity: parseInt(quantity, 10) || 0 } : item
    ));
  };

  // Handle removing an item from selection
  const handleRemoveItem = (itemId) => {
    setSelectedItems(selectedItems.filter(item => item.itemId !== itemId));
  };

  // Handle submitting the selected items
  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      toast.warning('Wybierz co najmniej jeden element');
      return;
    }

    // Filter out items with quantity less than 1
    const validItems = selectedItems.filter(item => item.quantity > 0);
    
    if (validItems.length === 0) {
      toast.warning('Wszystkie elementy muszą mieć ilość większą niż 0');
      return;
    }

    addItemsMutation.mutate(validItems);
  };

  // Handle cancel adding items
  const handleCancel = () => {
    setIsAdding(false);
    setSelectedItems([]);
  };

  // Render loading state
  if (isLoadingGuideInventory) {
    return (
      <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
        <h3 className="font-semibold text-lg mb-3 flex items-center">
          <Package size={18} className="mr-2 text-indigo-600" />
          Elementy magazynowe
        </h3>
        <Spinner size="sm" label="Ładowanie elementów magazynowych..." />
      </div>
    );
  }

  // Render error state
  if (isGuideInventoryError) {
    return (
      <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
        <h3 className="font-semibold text-lg mb-3 flex items-center">
          <Package size={18} className="mr-2 text-indigo-600" />
          Elementy magazynowe
        </h3>
        <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4">
          <p>Błąd podczas ładowania elementów: {guideInventoryError?.message || 'Nieznany błąd'}</p>
          <button 
            onClick={() => queryClient.invalidateQueries(['guideInventory', guideId])}
            className="flex items-center mt-2 text-red-800 hover:text-red-900"
          >
            <RotateCcw size={14} className="mr-1" /> Ponów próbę
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
      <h3 className="font-semibold text-lg mb-3 flex items-center">
        <Package size={18} className="mr-2 text-indigo-600" />
        Elementy magazynowe
      </h3>

      {/* Existing inventory items */}
      {!isAdding && (
        <div className="mb-4">
          {guideInventory?.items?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left text-sm font-medium text-gray-500">Nazwa</th>
                    <th className="py-2 px-3 text-left text-sm font-medium text-gray-500">Kategoria</th>
                    <th className="py-2 px-3 text-right text-sm font-medium text-gray-500">Ilość</th>
                    <th className="py-2 px-3 text-right text-sm font-medium text-gray-500">Zarezerwowano</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {guideInventory.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">{item.item.name}</td>
                      <td className="py-2 px-3 text-sm text-gray-500">{item.item.category}</td>
                      <td className="py-2 px-3 text-sm text-right text-gray-900">{item.quantity}</td>
                      <td className="py-2 px-3 text-sm text-right">
                        {item.reserved ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Tak
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Nie
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              Brak przypisanych elementów magazynowych
            </div>
          )}

          <button
            onClick={() => setIsAdding(true)}
            className="mt-4 flex items-center px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <Plus size={16} className="mr-1" /> Dodaj elementy magazynowe
          </button>
        </div>
      )}

      {/* Add new inventory items form */}
      {isAdding && (
        <div className="mb-4 border rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium mb-2">Dodaj elementy magazynowe</h4>
          
          {isInventoryLoading ? (
            <Spinner size="sm" label="Ładowanie elementów magazynowych..." />
          ) : isInventoryError ? (
            <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4">
              <p>Error loading inventory items. Please try again.</p>
            </div>
          ) : (
            <>
              {/* Inventory item selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wybierz element:
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  onChange={handleItemSelect}
                  value=""
                >
                  <option value="" disabled>Wybierz element magazynowy</option>
                  {inventoryItems?.items?.map((item) => (
                    <option 
                      key={item.id} 
                      value={item.id}
                      disabled={selectedItems.some(selected => selected.itemId === item.id)}
                    >
                      {item.name} ({item.category}) - Dostępnych: {item.quantity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected items list */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Wybrane elementy:</h5>
                {selectedItems.length === 0 ? (
                  <div className="text-gray-500 text-sm">Nie wybrano żadnych elementów</div>
                ) : (
                  <div className="space-y-2">
                    {selectedItems.map((selectedItem) => {
                      const itemDetails = inventoryItems?.items?.find(item => item.id === selectedItem.itemId);
                      
                      return (
                        <div key={selectedItem.itemId} className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-white">
                          <div className="flex-1">
                            <div className="font-medium">{itemDetails?.name}</div>
                            <div className="text-xs text-gray-500">{itemDetails?.category}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={itemDetails?.quantity || 999}
                              value={selectedItem.quantity}
                              onChange={(e) => handleQuantityChange(selectedItem.itemId, e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-right"
                            />
                            <button
                              onClick={() => handleRemoveItem(selectedItem.itemId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={selectedItems.length === 0 || addItemsMutation.isPending}
                  className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                >
                  {addItemsMutation.isPending ? 'Dodawanie...' : 'Dodaj elementy'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GuideInventoryPanel;