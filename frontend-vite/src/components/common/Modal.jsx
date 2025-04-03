import React from 'react';
import ReactDOM from 'react-dom';

const Modal = ({ title, children, onClose }) => {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-lg font-bold">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
