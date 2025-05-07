import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api.service';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

// Funkcja do pobierania dostępnych przedmiotów magazynowych
const fetchInventoryItems = async () => {
  const response = await api.get('/inventory/items', {
    params: { limit: 100 }
  });
  return response.data.items;
};

const InventoryItemSelector = ({ selectedItems = [], onItemsChange, readOnly = false }) => {
  // Pobierz przedmioty z magazynu
  const { data: inventoryItems = [], isLoading, error } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: fetchInventoryItems,
    staleTime: 5 * 60 * 1000, // 5 minut
    enabled: !readOnly // Pobieraj dane tylko jeśli nie jest w trybie tylko do odczytu
  });
  
  // Stan lokalny dla wyszukiwania
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrowane przedmioty na podstawie wyszukiwania
  const filteredItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Funkcja dodająca przedmiot do wybranych
  const addItem = (item) => {
    if (selectedItems.some(si => si.itemId === item.id)) {
      return; // Przedmiot już wybrany
    }
    
    const newItem = {
      itemId: item.id,
      quantity: 1, // Domyślnie 1
      item: {
        name: item.name,
        unit: item.unit
      }
    };
    
    onItemsChange([...selectedItems, newItem]);
    setSearchTerm(''); // Wyczyść wyszukiwanie po dodaniu
  };
  
  // Funkcja usuwająca przedmiot z wybranych
  const removeItem = (index) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    onItemsChange(newItems);
  };
  
  // Funkcja aktualizująca ilość wybranego przedmiotu
  const updateItemQuantity = (index, quantity) => {
    const newItems = [...selectedItems];
    newItems[index].quantity = parseFloat(quantity) || 0;
    onItemsChange(newItems);
  };
  
  // Jeśli jest w trybie tylko do odczytu, wyświetlamy tylko wybrane przedmioty
  if (readOnly) {
    return (
      <div>
        <h3 className="font-medium text-gray-700 mb-3">Wybrane przedmioty magazynowe</h3>
        {selectedItems.length === 0 ? (
          <p className="text-gray-500 italic">Brak wybranych przedmiotów</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {selectedItems.map((item, index) => (
              <li key={index} className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-gray-800 font-medium">{item.item.name}</span>
                  <p className="text-sm text-gray-500">
                    Ilość: {item.quantity} {item.item.unit}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-gray-700 mb-3">Wybierz przedmioty z magazynu</h3>
        <div className="relative">
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Wyszukaj przedmiot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isLoading && (
            <div className="absolute right-3 top-2 animate-spin h-5 w-5 border-2 border-indigo-500 rounded-full border-t-transparent"></div>
          )}
        </div>
        
        {error && (
          <p className="text-red-500 mt-2">Błąd ładowania przedmiotów: {error.message}</p>
        )}
        
        {searchTerm && (
          <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md">
            {filteredItems.length === 0 ? (
              <p className="p-3 text-gray-500 text-center">Nie znaleziono przedmiotów</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredItems.map(item => (
                  <li 
                    key={item.id} 
                    className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => addItem(item)}
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        Dostępne: {item.quantity} {item.unit}
                        {item.barcode && <span> | Kod: {item.barcode}</span>}
                      </div>
                    </div>
                    <button 
                      type="button"
                      className="p-1 text-indigo-600 hover:text-indigo-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem(item);
                      }}
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="font-medium text-gray-700 mb-3">Wybrane przedmioty</h3>
        {selectedItems.length === 0 ? (
          <p className="text-gray-500 italic">Brak wybranych przedmiotów</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {selectedItems.map((item, index) => (
              <li key={index} className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-gray-800 font-medium">{item.item.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <input
                      type="number"
                      className="w-20 p-1 border border-gray-300 rounded-md text-right"
                      value={item.quantity}
                      min="0.1"
                      step="0.1"
                      onChange={(e) => updateItemQuantity(index, e.target.value)}
                    />
                    <span className="ml-2 text-gray-600">{item.item.unit}</span>
                  </div>
                  <button 
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeItem(index)}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default InventoryItemSelector;
