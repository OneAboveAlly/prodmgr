import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Search, Plus, X, UserPlus, UserCheck } from 'lucide-react';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import api from '../../services/api.service';
import productionApi from '../../api/production.api';

const AssignedUsersPanel = ({ guideId }) => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Fetch assigned users
  const { 
    data: assignedUsers = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['assignedUsers', guideId],
    queryFn: () => productionApi.getAssignedUsers(guideId).then(data => data.users || []),
    onError: (err) => {
      console.error('Error fetching assigned users:', err);
      toast.error('Error fetching assigned users');
    }
  });

  // Search for users
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await api.get(`/users/search?term=${encodeURIComponent(searchTerm)}`);
      // Filter out already assigned users
      const filteredResults = response.data.filter(
        user => !assignedUsers.some(assigned => assigned.id === user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Error searching for users');
    } finally {
      setIsSearching(false);
    }
  };

  // Add user to selected list
  const handleSelectUser = (user) => {
    if (!selectedUsers.some(selected => selected.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchResults([]);
    setSearchTerm('');
  };

  // Remove user from selected list
  const handleRemoveSelected = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  // Assign multiple users mutation
  const assignUsersMutation = useMutation({
    mutationFn: (userIds) => productionApi.assignUsers(guideId, userIds),
    onSuccess: () => {
      toast.success('✅ Users assigned successfully');
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['assignedUsers', guideId] });
    },
    onError: (err) => {
      console.error('Error assigning users:', err);
      toast.error(err.response?.data?.message || 'Error assigning users');
    },
  });

  // Remove assigned user
  const removeUserMutation = useMutation({
    mutationFn: (userId) => productionApi.removeUser(guideId, userId),
    onSuccess: () => {
      toast.success('🗑️ User removed');
      queryClient.invalidateQueries({ queryKey: ['assignedUsers', guideId] });
    },
    onError: (err) => {
      console.error('Error removing user:', err);
      toast.error('❌ Error removing user');
    },
  });

  // Assign selected users
  const handleAssignUsers = () => {
    if (selectedUsers.length === 0) return;
    
    const userIds = selectedUsers.map(user => user.id);
    assignUsersMutation.mutate(userIds);
  };

  if (isLoading) return <Spinner label="Loading users..." />;
  
  if (isError) return (
    <div className="bg-white p-4 rounded-xl shadow space-y-4 border border-gray-200">
      <h2 className="text-lg font-bold text-gray-800">👥 Assigned Users</h2>
      <p className="text-red-600">Error: {error?.message || 'Unable to fetch user data'}</p>
    </div>
  );

  return (
    <div className="bg-white p-4 rounded-xl shadow space-y-4 border border-gray-200">
      <h2 className="text-lg font-bold text-gray-800">👥 Assigned Users</h2>

      {/* Search & Assignment Section */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search users by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8"
              onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={isSearching}
            >
              <Search size={18} />
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
            <ul className="divide-y">
              {searchResults.map(user => (
                <li 
                  key={user.id} 
                  className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                  onClick={() => handleSelectUser(user)}
                >
                  <span>
                    {user.firstName} {user.lastName} 
                    <span className="text-sm text-gray-500 ml-2">({user.email || user.login})</span>
                  </span>
                  <UserPlus size={16} className="text-indigo-600" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Selected Users:</h3>
            <ul className="space-y-1">
              {selectedUsers.map(user => (
                <li key={user.id} className="flex justify-between items-center bg-indigo-50 p-2 rounded-md">
                  <span>{user.firstName} {user.lastName}</span>
                  <button 
                    onClick={() => handleRemoveSelected(user.id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={handleAssignUsers}
              disabled={assignUsersMutation.isLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {assignUsersMutation.isLoading ? 'Assigning...' : 
                <>
                  <UserPlus size={16} /> 
                  Assign {selectedUsers.length} Users
                </>
              }
            </button>
          </div>
        )}
      </div>

      {/* Already Assigned Users List */}
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Currently Assigned Users:</h3>
        {assignedUsers.length === 0 ? (
          <p className="italic text-gray-500">No assigned users</p>
        ) : (
          <ul className="divide-y border rounded-md overflow-hidden">
            {assignedUsers.map((user) => (
              <li key={user.id} className="flex justify-between items-center p-2 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-green-600" />
                  <span>
                    {user.firstName} {user.lastName}{' '}
                    <span className="text-sm text-gray-500">({user.email || user.login})</span>
                  </span>
                </div>
                <button
                  onClick={() => removeUserMutation.mutate(user.id)}
                  className="text-sm text-red-600 hover:underline flex items-center gap-1"
                  disabled={removeUserMutation.isLoading}
                >
                  <X size={14} />
                  {removeUserMutation.isLoading ? 'Removing...' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AssignedUsersPanel;