import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../layouts/MainLayout';
import productionApi from '../api/productionApi';
import inventoryApi from '../api/inventoryApi';
import InventoryItemSelector from '../components/inventory/InventoryItemSelector';

const ProductionGuideFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [guide, setGuide] = useState(null);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const fetchGuide = async () => {
        try {
          const fetchedGuide = await productionApi.getGuide(id);
          setGuide(fetchedGuide);
        } catch (error) {
          console.error('Error fetching guide:', error);
        }
      };

      fetchGuide();
    }
  }, [isEditing, id]);

  useEffect(() => {
    if (isEditing && guide) {
      const fetchGuideInventory = async () => {
        try {
          const inventoryItems = await inventoryApi.getGuideInventory(id);
          const formattedItems = inventoryItems.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            stepId: item.stepId,
            item: item.item
          }));
          setSelectedInventoryItems(formattedItems);
        } catch (error) {
          console.error('Error fetching guide inventory:', error);
        }
      };

      fetchGuideInventory();
    }
  }, [isEditing, guide, id]);

  const handleInventoryItemsChange = (items) => {
    setSelectedInventoryItems(items);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', guide.name);
      formData.append('description', guide.description);

      let savedGuide;

      if (isEditing) {
        savedGuide = await productionApi.updateGuide(id, formData);
      } else {
        savedGuide = await productionApi.createGuide(formData);
      }

      if (selectedInventoryItems.length > 0) {
        await inventoryApi.addItemsToProductionGuide(
          savedGuide.id,
          selectedInventoryItems
        );
      }

      toast.success(`Guide ${isEditing ? 'updated' : 'created'} successfully!`);
      navigate(`/production/guides/${savedGuide.id}`);
    } catch (error) {
      console.error('Error saving guide:', error);
      toast.error('Failed to save guide.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Inventory Items</h2>
            <InventoryItemSelector
              selectedItems={selectedInventoryItems}
              onItemsChange={handleInventoryItemsChange}
              readOnly={false}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Guide' : 'Create Guide'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ProductionGuideFormPage;