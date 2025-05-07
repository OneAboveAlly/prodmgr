// frontend/src/components/leave/LeaveRequestButton.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import leaveApi from '../../api/leave.api';

const LeaveRequestButton = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    halfDay: false,
    morning: true,
    notes: ''
  });
  
  // Pobieranie typów urlopów
  const { data: leaveTypes, isLoading } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => leaveApi.getLeaveTypes().then(res => res.data),
    enabled: isModalOpen, // Pobieraj tylko gdy modal jest otwarty
  });
  
  // Mutacja do wysyłania wniosku urlopowego
  const requestLeaveMutation = useMutation({
    mutationFn: (data) => leaveApi.requestLeave(data),
    onSuccess: () => {
      toast.success('Wniosek urlopowy został pomyślnie złożony');
      queryClient.invalidateQueries({ queryKey: ['userLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['dailySummaries'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się złożyć wniosku urlopowego');
    }
  });
  
  // Obsługa otwierania/zamykania modalu
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  
  // Obsługa zmian w formularzu
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Resetowanie formularza do stanu początkowego
  const resetForm = () => {
    setFormData({
      leaveTypeId: '',
      startDate: '',
      endDate: '',
      halfDay: false,
      morning: true,
      notes: ''
    });
  };
  
  // Obsługa przesyłania formularza
  const handleSubmit = (e) => {
    e.preventDefault();
    requestLeaveMutation.mutate(formData);
  };
  
  return (
    <>
      <button
        onClick={openModal}
        className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
      >
        Zapytanie o urlop
      </button>
      
      {/* Modal wniosku urlopowego */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Tło modalu */}
            <div 
              className="fixed inset-0 bg-black opacity-50"
              onClick={closeModal}
            ></div>
            
            {/* Zawartość modalu */}
            <div className="bg-white rounded-lg shadow-xl z-10 w-full max-w-md">
              <div className="p-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Wniosek urlopowy</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Wypełnij poniższy formularz, aby złożyć wniosek o urlop.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-5">
                {/* Typ urlopu */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rodzaj urlopu
                  </label>
                  <select
                    name="leaveTypeId"
                    value={formData.leaveTypeId}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Wybierz rodzaj urlopu</option>
                    {isLoading ? (
                      <option disabled>Ładowanie rodzajów urlopów...</option>
                    ) : (
                      leaveTypes?.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name} {!type.paid && '(Bezpłatny)'}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                
                {/* Zakres dat */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data początkowa
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data końcowa
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      min={formData.startDate}
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                {/* Opcja pół dnia */}
                <div className="mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="halfDay"
                      name="halfDay"
                      checked={formData.halfDay}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="halfDay" className="ml-2 block text-sm font-medium text-gray-700">
                      Pół dnia
                    </label>
                  </div>
                  
                  {formData.halfDay && (
                    <div className="mt-2 ml-6">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="morning"
                          name="morning"
                          value="true"
                          checked={formData.morning}
                          onChange={() => setFormData(prev => ({ ...prev, morning: true }))}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="morning" className="ml-2 block text-sm font-medium text-gray-700">
                          Rano
                        </label>
                      </div>
                      
                      <div className="flex items-center mt-1">
                        <input
                          type="radio"
                          id="afternoon"
                          name="morning"
                          value="false"
                          checked={!formData.morning}
                          onChange={() => setFormData(prev => ({ ...prev, morning: false }))}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="afternoon" className="ml-2 block text-sm font-medium text-gray-700">
                          Popołudnie
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Notatki */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notatki (opcjonalnie)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Powód wniosku urlopowego lub dodatkowe informacje"
                  ></textarea>
                </div>
                
                {/* Przyciski akcji */}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Anuluj
                  </button>
                  
                  <button
                    type="submit"
                    disabled={requestLeaveMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                  >
                    {requestLeaveMutation.isPending ? 'Wysyłanie...' : 'Wyślij wniosek'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveRequestButton;