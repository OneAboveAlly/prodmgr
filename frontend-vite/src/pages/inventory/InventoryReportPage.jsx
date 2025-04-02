// ✅ Zaktualizowany InventoryReportPage.jsx z przyciskiem i automatycznym odświeżaniem po powrocie
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import inventoryApi from "../../api/inventory.api";
import InventoryReportFilters from "../../components/inventory/InventoryReportFilters";
import InventoryReportStats from "../../components/inventory/InventoryReportStats";
import InventoryReportTable from "../../components/inventory/InventoryReportTable";
import * as XLSX from "xlsx";
import { useAuth } from "../../contexts/AuthContext";

export default function InventoryReportPage() {
  const [filters, setFilters] = useState({ search: "", category: "", lowStock: false });
  const [report, setReport] = useState(null);
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  const { isReady, hasPermission } = useAuth();
  const canViewReport = hasPermission("inventory", "read", 1);

  useEffect(() => {
    if (!isReady || !canViewReport) return;
    fetchReport();
  }, [filters, isReady, canViewReport]);

  // 🔄 Automatyczne odświeżenie przy powrocie do zakładki
  useEffect(() => {
    const handleFocus = () => {
      if (isReady && canViewReport) {
        fetchReport();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isReady, canViewReport]);

  const fetchReport = async () => {
    try {
      const query = {
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.lowStock && { lowStock: "true" })
      };
      const { report } = await inventoryApi.getInventoryReport(query);
      setReport(report);
    } catch (err) {
      console.error("❌ Błąd raportu:", err);
    }
  };

  const exportToExcel = () => {
    const dataToExport = selected.length > 0 
      ? report.items.filter(item => selected.includes(item.id)) 
      : report.items;

    const ws = XLSX.utils.json_to_sheet(
      dataToExport.map(item => ({
        Nazwa: item.name,
        Kod: item.barcode,
        Kategoria: item.category,
        Lokalizacja: item.location,
        Jednostka: item.unit,
        Stan: item.quantity,
        Zarezerwowane: item.reserved,
        Dostępne: item.available,
        'Min. ilość': item.minQuantity ?? '-',
        Status: item.status,
        Cena: item.price != null ? `${item.price.toFixed(2)} zł` : '—'
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Raport");
    XLSX.writeFile(wb, `raport-magazynowy-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isReady) return <div className="p-4">⏳ Sprawdzanie dostępu...</div>;
  if (!canViewReport) return <div className="p-4 text-red-600">🚫 Brak uprawnień do przeglądu raportu magazynowego.</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
  <div className="flex items-center gap-2">
    <h1 className="text-2xl font-bold">📊 Raport magazynu</h1>
    <button 
      onClick={() => navigate("/inventory/transactions")}
      className="text-blue-600 text-sm underline"
    >
      Zobacz historię transakcji
    </button>
    <button
      onClick={fetchReport}
      className="text-sm text-gray-800 bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
    >
      🔄 Odśwież dane
    </button>
  </div>

  <div className="flex items-center gap-2">
    <button
      onClick={() => navigate(-1)}
      className="text-sm text-gray-600 underline"
    >
      ⬅️ Powrót
    </button>
    <button
      onClick={exportToExcel}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      ⬇️ Eksportuj do Excela {selected.length > 0 ? `(${selected.length})` : ''}
    </button>
  </div>
</div>


      <InventoryReportFilters
        filters={filters}
        setFilters={setFilters}
        categories={report?.stats?.categories || []}
      />

      <InventoryReportStats stats={report?.stats} />

      <InventoryReportTable 
        items={report?.items || []} 
        selected={selected} 
        setSelected={setSelected} 
      />
    </div>
  );
}
