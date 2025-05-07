import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaTimes, FaPrint, FaPlus, FaTrash, FaDownload, FaFilePdf } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';

// Komponent podglądu kodu kreskowego
const BarcodePreview = ({ data, generateOnePerRow }) => {
  const [barcodeImages, setBarcodeImages] = useState([]);
  
  const generateBarcode = useCallback((barcodeData) => {
    if (typeof window.JsBarcode !== 'function') {
      console.error('JsBarcode nie jest załadowany');
      return null;
    }

    if (!barcodeData || barcodeData.trim() === '') {
      return null;
    }

    const canvas = document.createElement('canvas');
    try {
      window.JsBarcode(canvas, barcodeData, {
        format: "CODE128",
        displayValue: true,
        fontSize: 16,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000",
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Błąd generowania kodu kreskowego:', error);
      return null;
    }
  }, []);

  const handleDownload = (imageData, index, barcodeText) => {
    const link = document.createElement('a');
    link.href = imageData;
    const safeText = barcodeText.replace(/[^a-z0-9]/gi, '_').substring(0, 15);
    link.download = `kod_kreskowy_${safeText}_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (generateOnePerRow) {
      const images = data
        .filter(item => item.trim() !== '')
        .map(item => {
          return {
            image: generateBarcode(item),
            data: item
          };
        })
        .filter(item => item.image !== null);
      
      setBarcodeImages(images);
    } else {
      const nonEmptyData = data.filter(item => item.trim() !== '');
      if (nonEmptyData.length > 0) {
        const combinedData = nonEmptyData.join('\n');
        const image = generateBarcode(combinedData);
        
        setBarcodeImages(image ? [{ 
          image: image, 
          data: combinedData 
        }] : []);
      } else {
        setBarcodeImages([]);
      }
    }
  }, [data, generateOnePerRow, generateBarcode]);

  return (
    <div className="barcode-preview flex flex-col gap-4">
      {barcodeImages.map((item, index) => (
        <div key={index} className="barcode-item flex flex-col items-center p-3 border rounded-lg">
          <img 
            src={item.image} 
            alt={`Kod kreskowy ${index + 1}`} 
            className="max-w-full h-auto"
          />
          <div className="mt-2 text-sm text-gray-600">
            {item.data}
          </div>
          <button
            onClick={() => handleDownload(item.image, index, item.data)}
            className="mt-2 bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 flex items-center text-sm"
          >
            <FaDownload className="mr-1" /> Pobierz PNG
          </button>
        </div>
      ))}
      {barcodeImages.length === 0 && (
        <div className="text-center p-4 text-gray-500">
          Wprowadź dane, aby wygenerować kody kreskowe
        </div>
      )}
    </div>
  );
};

const BarcodeModal = ({ onClose }) => {
  const [barcodesData, setBarcodesData] = useState(['']);
  const [generateOnePerRow, setGenerateOnePerRow] = useState(true);
  const [jsBarCodeLoaded, setJsBarCodeLoaded] = useState(false);
  const printRef = useRef();

  // Load JsBarcode library
  useEffect(() => {
    const loadScripts = async () => {
      if (!window.JsBarcode) {
        const jsBarcodeScript = document.createElement('script');
        jsBarcodeScript.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js';
        jsBarcodeScript.async = true;
        
        jsBarcodeScript.onload = () => {
          console.log('Biblioteka JsBarcode została załadowana');
          setJsBarCodeLoaded(true);
        };
        
        jsBarcodeScript.onerror = () => {
          console.error('Nie udało się załadować biblioteki JsBarcode');
        };
        
        document.body.appendChild(jsBarcodeScript);
      } else {
        setJsBarCodeLoaded(true);
      }
    };
    
    loadScripts();
    
    return () => {
      const scripts = document.querySelectorAll('script[src*="jsbarcode"]');
      scripts.forEach(script => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      });
    };
  }, []);

  // Add new row
  const addNewRow = () => {
    setBarcodesData(prevData => [...prevData, '']);
  };

  // Remove row
  const removeRow = (index) => {
    setBarcodesData(prevData => {
      const newData = [...prevData];
      newData.splice(index, 1);
      return newData.length === 0 ? [''] : newData;
    });
  };

  // Update barcode data
  const updateBarcodeData = (index, value) => {
    setBarcodesData(prevData => {
      const newData = [...prevData];
      newData[index] = value;
      return newData;
    });
  };

  // Generate PDF function
  const generatePDF = () => {
    if (!window.JsBarcode) {
      alert('Biblioteka JsBarcode nie jest dostępna');
      return;
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [60, 30]
    });

    const validBarcodes = barcodesData.filter(item => item.trim() !== '');
    
    if (validBarcodes.length === 0) {
      alert('Brak danych do wygenerowania kodów kreskowych');
      return;
    }

    validBarcodes.forEach((barcodeText, index) => {
      if (index > 0) {
        pdf.addPage([60, 30]);
      }
      
      const canvas = document.createElement('canvas');
      try {
        window.JsBarcode(canvas, barcodeText, {
          format: "CODE128",
          displayValue: true,
          fontSize: 8,
          margin: 2,
          width: 1.5,
          height: 40,
          background: "#ffffff",
          lineColor: "#000000",
        });
        
        const imageData = canvas.toDataURL('image/png');
        const imgWidth = 55;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        const xPosition = (60 - imgWidth) / 2;
        
        pdf.addImage(imageData, 'PNG', xPosition, 1, imgWidth, imgHeight);
        pdf.setFontSize(8);
        pdf.text(barcodeText, 30, 25, { align: 'center' });
        
      } catch (error) {
        console.error('Błąd generowania kodu kreskowego:', error);
        pdf.setFontSize(10);
        pdf.setTextColor(255, 0, 0);
        pdf.text(`Błąd: ${error.message}`, 5, 15);
        pdf.setTextColor(0, 0, 0);
      }
    });
    
    pdf.save('etykiety.pdf');
  };

  // Print function
  const handlePrint = () => {
    if (!jsBarCodeLoaded) {
      alert('Biblioteka JsBarcode nie jest załadowana');
      return;
    }

    const validBarcodes = barcodesData.filter(item => item.trim() !== '');
    if (validBarcodes.length === 0) {
      alert('Wprowadź dane do wygenerowania kodów kreskowych');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Nie można otworzyć okna drukowania. Sprawdź blokadę wyskakujących okien.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etykiety</title>
          <style>
            @page {
              size: 60mm 30mm;
              margin: 0;
              padding: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: white;
            }
            .label-container {
              width: 60mm;
              height: 30mm;
              margin: 0;
              padding: 0;
              text-align: center;
              page-break-after: always;
              page-break-inside: avoid;
            }
            img {
              max-width: 90%;
              max-height: 70%;
              margin: 0 auto;
              display: block;
            }
            .barcode-text {
              font-size: 12px;
              font-family: monospace;
              margin: 5px 0 0 0;
              padding: 0;
              text-align: center;
            }
          </style>
        </head>
        <body>
          ${validBarcodes.map((barcodeText) => {
            const canvas = document.createElement('canvas');
            window.JsBarcode(canvas, barcodeText, {
              format: "CODE128",
              displayValue: true,
              fontSize: 14,
              margin: 5,
              background: "#ffffff",
              lineColor: "#000000",
              width: 2,
              height: 60,
            });
            const imageData = canvas.toDataURL('image/png');
            
            return `
              <div class="label-container">
                <img src="${imageData}" alt="kod kreskowy" />
                <div class="barcode-text">${barcodeText}</div>
              </div>
            `;
          }).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Poczekaj na załadowanie obrazów przed drukowaniem
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-xl font-semibold">Generator kodów kreskowych</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Settings Panel */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Ustawienia</h3>
              
              <div className="mb-4">
                <label className="flex items-center mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateOnePerRow}
                    onChange={() => setGenerateOnePerRow(!generateOnePerRow)}
                    className="form-checkbox h-5 w-5 text-blue-600 mr-2"
                  />
                  <span>Generuj jeden kod kreskowy w wierszu</span>
                </label>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Dane:
                </label>
                
                {barcodesData.map((data, index) => (
                  <div key={index} className="flex mb-2">
                    <input
                      type="text"
                      value={data}
                      onChange={(e) => updateBarcodeData(index, e.target.value)}
                      className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Wprowadź dane kodu kreskowego"
                    />
                    <div className="flex">
                      {barcodesData.length > 1 && (
                        <button
                          onClick={() => removeRow(index)}
                          className="bg-red-500 text-white px-3 py-2 hover:bg-red-600"
                          title="Usuń wiersz"
                        >
                          <FaTrash />
                        </button>
                      )}
                      {index === barcodesData.length - 1 && (
                        <button
                          onClick={addNewRow}
                          className="bg-green-500 text-white px-3 py-2 rounded-r-md hover:bg-green-600"
                          title="Dodaj wiersz"
                        >
                          <FaPlus />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Preview Panel */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Podgląd</h3>
              
              <div>
                {!jsBarCodeLoaded && (
                  <div className="text-center p-4 text-gray-500">
                    Ładowanie biblioteki JsBarcode...
                  </div>
                )}
                {jsBarCodeLoaded && (
                  <BarcodePreview
                    data={barcodesData}
                    generateOnePerRow={generateOnePerRow}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={generatePDF}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <FaFilePdf className="mr-2" />
              Generuj PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              <FaPrint className="mr-2" />
              Drukuj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeModal;
