import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, PencilIcon, PlusIcon, MinusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

const InventoryTableView = ({ 
  items = [], 
  onUpdateQuantity = null,
  onAdjustQuantity = null,
  showActions = true,
  showCheckboxes = false,
  selected = [],
  onSelectionChange = null,
  // Nowe parametry do niestandardowego wyświetlania
  customMode = 'default', // 'default', 'guide' - tryb wyświetlania dla przewodnika
  showWithdrawnInfo = false, // Pokazuje informacje o pobraniu (przez kogo)
  selectedBgClass = ''
}) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canSeePrice = hasPermission('inventory', 'read', 2);

  // Obsługa zaznaczania
  const toggleItem = (id) => {
    if (!onSelectionChange) return;
    
    if (selected.includes(id)) {
      onSelectionChange(selected.filter(itemId => itemId !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };

  // Zaznaczanie wszystkich
  const toggleAll = () => {
    if (!onSelectionChange) return;
    
    if (selected.length === items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(item => item.id));
    }
  };

  // Renderowanie w zależności od trybu
  const isGuideMode = customMode === 'guide';

  return (
    <div className="overflow-x-auto">
      {showCheckboxes && onSelectionChange && (
        <div className="mb-2 text-sm text-gray-600">
          Zaznaczono {selected.length} z {items.length} pozycji
        </div>
      )}
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {showCheckboxes && onSelectionChange && (
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input 
                  type="checkbox" 
                  checked={items.length > 0 && selected.length === items.length}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
            )}
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nazwa
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kod
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ilość
            </th>
            
            {!isGuideMode && (
              <>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zarezerwowane
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dostępne
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lokalizacja
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategoria
                </th>
              </>
            )}
            
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {isGuideMode ? "Status" : "Jednostka"}
            </th>
            
            {showWithdrawnInfo && (
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pobrano przez
              </th>
            )}
            
            {canSeePrice && !isGuideMode && (
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cena
              </th>
            )}
            
            {showActions && (
              <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Akcje
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-6 py-4 text-center text-gray-500 italic">
                Brak przedmiotów do wyświetlenia
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {showCheckboxes && onSelectionChange && (
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selected.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                )}
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-gray-500 truncate max-w-xs" title={item.description}>
                      {item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}
                    </div>
                  )}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.barcode}
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <span className={
                    !isGuideMode && item.minQuantity != null && item.quantity <= item.minQuantity
                      ? item.quantity === 0
                        ? "text-red-600 font-semibold"
                        : "text-yellow-600 font-semibold"
                      : "text-green-600 font-semibold"
                  }>
                    {item.quantity} {item.unit}
                  </span>
                  {!isGuideMode && item.minQuantity && (
                    <div className="text-xs text-gray-500">
                      Min: {item.minQuantity} {item.unit}
                    </div>
                  )}
                </td>
                
                {!isGuideMode && (
                  <>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <span className={item.reserved > 0 ? "text-yellow-600 font-semibold" : "text-gray-500"}>
                        {item.reserved || 0} {item.unit}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <span className={
                        item.available <= 0
                          ? "text-red-600 font-semibold"
                          : item.minQuantity != null && item.available <= item.minQuantity
                            ? "text-yellow-600 font-semibold" 
                            : "text-green-600 font-semibold"
                      }>
                        {item.available} {item.unit}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.location || '—'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category || '—'}
                    </td>
                  </>
                )}
                
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  {isGuideMode ? (
                    item.reserved ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Zarezerwowane
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Pobrane
                      </span>
                    )
                  ) : (
                    <span className="text-gray-500">{item.unit}</span>
                  )}
                </td>
                
                {showWithdrawnInfo && (
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.withdrawnBy || '—'}
                  </td>
                )}
                
                {canSeePrice && !isGuideMode && (
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.price ? `${item.price.toFixed(2)} zł` : '—'}
                  </td>
                )}
                
                {showActions && (
                  <td className={`px-4 py-2 ${selectedBgClass}`}>
                    {item.customActions ? (
                      item.customActions
                    ) : (
                      <div className="flex space-x-2 justify-end">
                        {/* Przycisk podglądu - dostępny dla wszystkich z dostępem do magazynu */}
                        <button
                          onClick={() => navigate(`/inventory/items/${item.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Zobacz szczegóły"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Przycisk pobierania przedmiotu - dla użytkowników z uprawnieniami issue */}
                        {hasPermission('inventory', 'issue') && (
                          <button
                            onClick={() => onUpdateQuantity ? onUpdateQuantity(item, 'remove') : navigate(`/inventory/items/withdraw/${item.id}`)}
                            className="text-red-600 hover:text-red-900"
                            title="Pobierz przedmiot"
                          >
                            <MinusIcon className="h-5 w-5" />
                          </button>
                        )}
                        
                        {/* Przycisk dodawania ilości - tylko dla osób z dodatkowymi uprawnieniami */}
                        {hasPermission('inventory', 'manage') && onUpdateQuantity && (
                          <button
                            onClick={() => onUpdateQuantity(item, 'add')}
                            className="text-green-600 hover:text-green-900"
                            title="Dodaj ilość"
                          >
                            <PlusIcon className="h-5 w-5" />
                          </button>
                        )}
                        
                        {/* Korekta ilości - tylko dla osób z uprawnieniami manage */}
                        {hasPermission('inventory', 'manage', 2) && onAdjustQuantity && (
                          <button
                            onClick={() => onAdjustQuantity(item)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Korekta ilości (zarządzający)"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                        )}
                        
                        {/* Przycisk edycji - tylko dla osób z uprawnieniami do update */}
                        {hasPermission('inventory', 'update') && (
                          <button
                            onClick={() => navigate(`/inventory/items/edit/${item.id}`)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edytuj przedmiot"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTableView; 