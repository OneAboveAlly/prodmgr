// frontend/src/components/common/PermissionDebugger.js
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const PermissionDebugger = () => {
  const { user, hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  
  if (!user) return null;
  
  // Pobierz wszystkie uprawnienia
  const allPermissions = user.permissions ? Object.keys(user.permissions) : [];
  
  // Filtruj uprawnienia na podstawie wprowadzonego tekstu
  const filteredPermissions = allPermissions.filter(
    perm => perm.toLowerCase().includes(filter.toLowerCase())
  );
  
  // Grupuj uprawnienia według modułu
  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    const [module] = perm.split('.');
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg hover:bg-gray-700"
      >
        {isOpen ? 'Hide' : 'Debug'} Permissions
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Permission Debugger</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    &times;
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter Permissions
                  </label>
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="Type to filter..."
                  />
                </div>
                
                <div className="mt-4 border rounded max-h-96 overflow-y-auto">
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">User Info</h4>
                    <div className="ml-2 text-sm">
                      <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                      <p><strong>Roles:</strong> {user.roles.map(r => r.name).join(', ')}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Permissions</h4>
                    {Object.keys(groupedPermissions).length === 0 ? (
                      <p className="text-sm text-gray-500">No permissions found.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(groupedPermissions).map(([module, perms]) => (
                          <div key={module} className="border-b pb-2">
                            <h5 className="font-medium text-gray-700 capitalize">{module}</h5>
                            <ul className="ml-4 space-y-1">
                              {perms.map(perm => {
                                const [, action] = perm.split('.');
                                const value = user.permissions[perm];
                                return (
                                  <li key={perm} className="text-sm">
                                    <span className="text-gray-600 capitalize">{action}:</span>
                                    <span className={`ml-2 font-semibold ${
                                      value > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {value > 0 ? `Level ${value}` : 'No access'}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      ({hasPermission(module, action) ? 'Has Access' : 'No Access'})
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionDebugger;