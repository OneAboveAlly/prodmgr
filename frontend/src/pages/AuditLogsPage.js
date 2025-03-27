import React, {  useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';
import { saveAs } from 'file-saver';

const fetchAuditLogs = async ({ queryKey }) => {
  const [, filters] = queryKey;
  const params = new URLSearchParams(filters);
  // Fix the API endpoint path - make sure there's no duplicate '/api/'
  const res = await api.get(`/audit-logs?${params.toString()}`);

  return res.data;
};

const AuditLogsPage = () => {
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState({
    status: 'all',
    user: '',
    from: '',
    to: '',
    page: 1
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: fetchAuditLogs,
    enabled: hasPermission('auditLogs', 'read'),
    refetchInterval: 10000 // 10 sekund
    // refetch dostępny, jakby trzeba było ręcznie odświeżyć
  });

  const handleChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const exportCSV = () => {
    const rows = data.logs.map(log => ({
      user: `${log.user?.firstName || ''} ${log.user?.lastName || ''}`,
      action: log.action,
      module: log.module,
      date: new Date(log.createdAt).toLocaleString(),
      details: JSON.stringify(log.meta)
    }));

    const csvContent = [
      ['User', 'Action', 'Module', 'Date', 'Details'],
      ...rows.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `audit_logs_${Date.now()}.csv`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Audit Logs</h1>

      {/* Filtry */}
      <div className="flex flex-wrap gap-4 mb-4">
        <select name="status" value={filters.status} onChange={handleChange}
          className="border border-gray-300 rounded px-3 py-1 text-sm">
          <option value="all">Status: All</option>
          <option value="active">Only Working</option>
          <option value="inactive">Only Not Working</option>
        </select>

        <input
          type="text"
          name="user"
          placeholder="Search by user"
          value={filters.user}
          onChange={handleChange}
          className="border border-gray-300 rounded px-3 py-1 text-sm"
        />

        <input
          type="date"
          name="from"
          value={filters.from}
          onChange={handleChange}
          className="border border-gray-300 rounded px-3 py-1 text-sm"
        />
        <input
          type="date"
          name="to"
          value={filters.to}
          onChange={handleChange}
          className="border border-gray-300 rounded px-3 py-1 text-sm"
        />

        <button onClick={exportCSV} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
          Export CSV
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white shadow overflow-x-auto rounded">
        {isLoading ? (
          <div className="p-4">Loading...</div>
        ) : error ? (
          <div className="p-4 text-red-500">Error: {error.message}</div>
        ) : (
          <>
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Module</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2">{log.user?.firstName} {log.user?.lastName}</td>
                    <td className="px-4 py-2 capitalize">{log.action}</td>
                    <td className="px-4 py-2">{log.module}</td>
                    <td className="px-4 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(log.meta, null, 2)}</pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginacja */}
            <div className="flex justify-between items-center p-4 text-sm">
              <span>
                Page {filters.page} of {data.pagination.pages}
              </span>
              <div className="space-x-2">
                <button
                  disabled={filters.page === 1}
                  onClick={() => handlePageChange(filters.page - 1)}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  disabled={filters.page === data.pagination.pages}
                  onClick={() => handlePageChange(filters.page + 1)}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
