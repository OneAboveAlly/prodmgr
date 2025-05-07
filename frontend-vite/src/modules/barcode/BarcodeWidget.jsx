import React, { useState } from 'react';
import { FaBarcode } from 'react-icons/fa';
import BarcodeModal from './BarcodeModal';

const BarcodeWidget = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={toggleModal}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Barcode Generator"
        >
          <FaBarcode className="text-gray-600" />
        </button>
      </div>

      {isModalOpen && <BarcodeModal onClose={toggleModal} />}
    </>
  );
};

export default BarcodeWidget;
