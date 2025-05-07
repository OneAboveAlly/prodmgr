import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import roleApi from '../../api/role.api';
import { toast } from 'react-toastify';

const RoleForm = ({ role, onSubmit, isLoading, onChange }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedModules, setExpandedModules] = useState({});
  const [permissionValues, setPermissionValues] = useState({});
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    //watch,
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      permissions: {},
    },
  });

  //const watchedPermissions = watch('permissions');

  // Powiadomienie rodzica, gdy formularz jest zmieniony
  useEffect(() => {
    if (onChange && isDirty) {
      onChange(true);
    }
  }, [isDirty, onChange]);

  // Pobierz wszystkie uprawnienia z API
  const { data: permissionsData, isLoading: permissionsLoading, refetch: refetchPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleApi.getAllPermissions().then((res) => res.data),
    staleTime: 1000 * 60 * 5,
  });

  // Inicjalizacja formularza i lokalnego stanu, gdy dane roli są dostępne
  useEffect(() => {
    if (role) {
      // Reset formularza z danymi roli
      reset({
        name: role.name || '',
        description: role.description || '',
        permissions: role.permissions || {},
      });

      // Ustaw lokalny stan wartości uprawnień
      setPermissionValues(role.permissions || {});

      // Ustaw rozwinięte moduły
      const initialModules = {};
      Object.keys(role.permissions || {}).forEach((permKey) => {
        const module = permKey.split('.')[0];
        initialModules[module] = true;
      });

      setExpandedModules(initialModules);
    }
  }, [role, reset]);

  const handleFormSubmit = (data) => {
    const cleanPermissions = {};
    
    // Użyj naszego lokalnego stanu permissionValues dla uprawnień
    Object.entries(permissionValues).forEach(([key, value]) => {
      const numericValue = parseInt(value, 10);
      if (numericValue > 0) {
        cleanPermissions[key] = numericValue;
      }
    });

    onSubmit({
      ...data,
      permissions: cleanPermissions,
    });
  };

  const handlePermissionChange = () => {
    if (onChange) {
      onChange(true);
    }
  };

  const toggleModule = (moduleName) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  const getPermissionValue = (permKey) => {
    // Użyj lokalnego stanu do pobrania wartości uprawnienia
    const value = permissionValues[permKey];
    if (value === undefined || value === null) return 0;
    return parseInt(value);
  };

  const setPermissionValue = (permKey, value) => {
    // Aktualizacja stanu formularza
    setValue(`permissions.${permKey}`, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    
    // Aktualizacja lokalnego stanu
    setPermissionValues(prev => ({
      ...prev,
      [permKey]: value
    }));
    
    handlePermissionChange();
  };

  // Funkcja do odświeżania listy uprawnień
  const refreshPermissions = async () => {
    try {
      setRefreshingPermissions(true);
      
      try {
        // Najpierw próbujemy użyć dedykowanego endpointu do odświeżania cache'u
        await roleApi.refreshPermissionsCache();
        // Po odświeżeniu cache, odśwież dane
        await refetchPermissions();
      } catch (error) {
        console.warn('Nie można użyć dedykowanego endpointu do odświeżania, przechodzę do unieważnienia zapytania', error);
        // Jeśli endpoint nie zadziała, po prostu odśwież zapytanie
        await queryClient.invalidateQueries(['permissions']);
      }
      
      toast.success('Lista uprawnień została odświeżona');
    } catch {
      toast.error('Nie udało się odświeżyć listy uprawnień');
    } finally {
      setRefreshingPermissions(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nazwa roli</label>
          <input
            type="text"
            {...register('name', { required: 'Nazwa roli jest wymagana' })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm ${
              errors.name ? 'border-red-500' : ''
            }`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Opis</label>
          <textarea
            {...register('description')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Uprawnienia</h3>
          <button
            type="button"
            onClick={refreshPermissions}
            disabled={refreshingPermissions}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {refreshingPermissions ? 'Odświeżanie...' : 'Odśwież uprawnienia'}
          </button>
        </div>
        
        {permissionsLoading ? (
          <div className="py-4 text-center">Ładowanie uprawnień...</div>
        ) : permissionsData ? (
          <div className="border rounded-md divide-y">
            {Object.entries(permissionsData.groupedByModule).map(([moduleName, modulePermissions]) => (
              <div key={moduleName}>
                <div
                  onClick={() => toggleModule(moduleName)}
                  className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                >
                  <h4 className="text-base font-medium text-gray-900 capitalize">{moduleName}</h4>
                  <span>{expandedModules[moduleName] ? '▲' : '▼'}</span>
                </div>

                {expandedModules[moduleName] && (
                  <div className="p-4 bg-white">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uprawnienie</th>
                          <th className="text-center">Brak</th>
                          <th className="text-center">Podgląd</th>
                          <th className="text-center">Edycja</th>
                          <th className="text-center">Pełne</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {modulePermissions.map((perm) => {
                          const key = `${perm.module}.${perm.action}`;
                          const currentVal = getPermissionValue(key);

                          return (
                            <tr key={perm.id}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                                {perm.description || perm.action}
                              </td>
                              {[0, 1, 2, 3].map((val) => (
                                <td className="text-center" key={val}>
                                  <input
                                    type="radio"
                                    name={`perm_${key}`}
                                    checked={currentVal === val}
                                    onChange={() => setPermissionValue(key, val)}
                                    className="h-4 w-4 text-indigo-600 cursor-pointer"
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-red-500">Nie udało się załadować uprawnień.</div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => navigate('/roles')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {isLoading ? 'Zapisywanie...' : 'Zapisz'}
        </button>
      </div>
    </form>
  );
};

export default RoleForm;