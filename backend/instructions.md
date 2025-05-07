
Can you add this next to notification bell and message icon??
Like a chat widget from:C:\Users\nowat\production-manager\frontend-vite\src\modules\chat
Here is mainlayout
C:\Users\nowat\production-manager\frontend-vite\src\components\layout\MainLayout.jsx
and my programm code:
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPrint, FaPlus, FaTrash, FaDownload, FaFilePdf } from 'react-icons/fa';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';

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

  useEffect(() => {
    // Generowanie kodów kreskowych
    if (generateOnePerRow) {
      // Generuj osobny kod dla każdego niepustego wpisu
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
      // Generuj jeden kod dla wszystkich niepustych wpisów
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

  const handleDownload = (imageData, index, barcodeText) => {
    const link = document.createElement('a');
    link.href = imageData;
    
    // Używamy tekstu kodu kreskowego jako część nazwy pliku (ograniczone do 15 znaków)
    const safeText = barcodeText.replace(/[^a-z0-9]/gi, '_').substring(0, 15);
    link.download = `barcode_${safeText}_${index + 1}.png`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="barcode-preview flex flex-col gap-8">
      {barcodeImages.map((item, index) => (
        <div key={index} className="barcode-item flex flex-col items-center p-4 border rounded-lg">
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
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
          >
            <FaDownload className="mr-2" /> Pobierz PNG
          </button>
        </div>
      ))}
      {barcodeImages.length === 0 && (
        <div className="text-center p-4 text-gray-500">
          Wprowadź dane aby wygenerować kody kreskowe
        </div>
      )}
    </div>
  );
};

// Komponent wydruku dla etykiet - super uproszczony i zoptymalizowany do druku etykiet
class LabelPrintComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      barcodes: [],
      loading: true,
      error: null
    };
  }

  componentDidMount() {
    this.generateBarcodes();
  }

  componentDidUpdate(prevProps) {
    // Regeneruj kody kreskowe, gdy zmienią się dane
    if (
      prevProps.data !== this.props.data ||
      prevProps.generateOnePerRow !== this.props.generateOnePerRow
    ) {
      this.generateBarcodes();
    }
  }

  generateBarcodes() {
    this.setState({ loading: true, error: null });
    
    try {
      const { data, generateOnePerRow } = this.props;
      const barcodes = [];
      
      if (!window.JsBarcode) {
        throw new Error('JsBarcode nie jest dostępne');
      }
      
      if (generateOnePerRow) {
        // Generuj osobny kod dla każdego niepustego wpisu
        data
          .filter(item => item.trim() !== '')
          .forEach(item => {
            try {
              // Tworzymy canvas do generowania kodu kreskowego
              const canvas = document.createElement('canvas');
              canvas.width = 300;
              canvas.height = 100;
              
              window.JsBarcode(canvas, item, {
                format: "CODE128",
                displayValue: true,
                fontSize: 14,
                margin: 5,
                background: "#ffffff",
                lineColor: "#000000",
                width: 2,
                height: 60,
              });
              
              barcodes.push({
                img: canvas.toDataURL('image/png'),
                data: item
              });
            } catch (error) {
              console.error('Błąd generowania kodu kreskowego:', error);
            }
          });
      } else {
        // Generuj jeden kod dla wszystkich niepustych wpisów
        const nonEmptyData = data.filter(item => item.trim() !== '');
        if (nonEmptyData.length > 0) {
          try {
            const combinedData = nonEmptyData.join('\n');
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 100;
            
            window.JsBarcode(canvas, combinedData, {
              format: "CODE128",
              displayValue: true,
              fontSize: 14,
              margin: 5,
              background: "#ffffff",
              lineColor: "#000000",
              width: 2,
              height: 60,
            });
            
            barcodes.push({
              img: canvas.toDataURL('image/png'),
              data: combinedData
            });
          } catch (error) {
            console.error('Błąd generowania kodu kreskowego:', error);
          }
        }
      }
      
      this.setState({ barcodes, loading: false });
    } catch (error) {
      this.setState({ error: error.message, loading: false });
    }
  }

  render() {
    const { barcodes, loading, error } = this.state;
    
    if (loading) {
      return <div>Ładowanie...</div>;
    }
    
    if (error) {
      return <div>Błąd: {error}</div>;
    }
    
    if (barcodes.length === 0) {
      return <div>Brak danych</div>;
    }

    // Absolutnie minimalistyczny HTML dla drukarki etykiet
    return (
      <div>
        {barcodes.map((barcode, index) => (
          <div key={index} className="label-container" style={{
            width: '100%',
            height: 'auto',
            margin: '0',
            padding: '0',
            textAlign: 'center',
            pageBreakAfter: 'always',
            pageBreakInside: 'avoid'
          }}>
            <img 
              src={barcode.img} 
              alt="barcode"
              style={{
                width: '90%',
                height: 'auto',
                margin: '0 auto',
                display: 'block',
                maxHeight: '80px'
              }}
            />
            <div style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              margin: '5px 0 0 0',
              padding: '0',
              textAlign: 'center'
            }}>
              {barcode.data}
            </div>
          </div>
        ))}
      </div>
    );
  }
}

const BarcodeGenerator = () => {
  const [barcodesData, setBarcodesData] = useState(['']);
  const [generateOnePerRow, setGenerateOnePerRow] = useState(true);
  const [jsBarCodeLoaded, setJsBarCodeLoaded] = useState(false);
  const printComponentRef = useRef();
  const navigate = useNavigate();

  // Ładowanie skryptu JsBarcode
  useEffect(() => {
    const loadScripts = async () => {
      // Ładowanie JsBarcode jeśli nie jest już załadowany
      if (!window.JsBarcode) {
        const jsBarcodeScript = document.createElement('script');
        jsBarcodeScript.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js';
        jsBarcodeScript.async = true;
        
        jsBarcodeScript.onload = () => {
          console.log('JsBarcode został załadowany');
          setJsBarCodeLoaded(true);
        };
        
        jsBarcodeScript.onerror = () => {
          console.error('Nie udało się załadować JsBarcode');
        };
        
        document.body.appendChild(jsBarcodeScript);
      } else {
        setJsBarCodeLoaded(true);
      }
    };
    
    loadScripts();
    
    return () => {
      // Usunięcie skryptów gdy komponent jest odmontowywany
      const scripts = document.querySelectorAll('script[src*="jsbarcode"]');
      scripts.forEach(script => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      });
    };
  }, []);

  // Dodawanie nowego wiersza
  const addNewRow = () => {
    setBarcodesData(prevData => [...prevData, '']);
  };

  // Usuwanie wiersza
  const removeRow = (index) => {
    setBarcodesData(prevData => {
      const newData = [...prevData];
      newData.splice(index, 1);
      return newData.length === 0 ? [''] : newData;
    });
  };

  // Aktualizacja danych kodu kreskowego
  const updateBarcodeData = (index, value) => {
    setBarcodesData(prevData => {
      const newData = [...prevData];
      newData[index] = value;
      return newData;
    });
  };

  // Funkcja do drukowania etykiet
  const handlePrint = useReactToPrint({
    content: () => printComponentRef.current,
    documentTitle: 'Etykiety',
    removeAfterPrint: true,
    pageStyle: `
      @page { 
        size: 60mm 30mm; 
        margin: 0mm; 
        padding: 0mm;
      }
      @media print {
        html, body { 
          width: 100%;
          height: auto;
          margin: 0 !important;
          padding: 0 !important;
          background-color: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        img { 
          max-width: 100% !important; 
          max-height: 70% !important;
          width: auto !important;
          height: auto !important;
          margin: 0 auto !important;
        }
        .label-container {
          width: 100% !important;
          height: 100% !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      }
    `,
    onBeforeGetContent: () => {
      console.log('Przygotowanie etykiet do druku...');
      // Nie potrzebujemy opóźnienia dla etykiet
      return Promise.resolve();
    },
    onBeforePrint: () => console.log('Rozpoczęcie drukowania etykiet'),
    onAfterPrint: () => console.log('Zakończono drukowanie etykiet'),
    onPrintError: (error) => console.error('Błąd drukowania etykiet:', error),
  });

  // Funkcja do generowania i pobierania PDF
  const generatePDF = () => {
    if (!window.JsBarcode) {
      alert('Biblioteka JsBarcode nie jest dostępna');
      return;
    }

    // Tworzymy nowy dokument PDF w formacie etykiet
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [60, 30] // format etykiety 60mm x 30mm
    });

    // Przetwarzamy tylko niepuste wpisy
    const validBarcodes = barcodesData.filter(item => item.trim() !== '');
    
    if (validBarcodes.length === 0) {
      alert('Brak danych do wygenerowania kodów kreskowych');
      return;
    }

    // Iterujemy przez dane
    validBarcodes.forEach((barcodeText, index) => {
      if (index > 0) {
        // Nowa strona dla każdego nowego kodu kreskowego
        pdf.addPage([60, 30]);
      }
      
      // Generujemy kod kreskowy na Canvas
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
        
        // Dodajemy obrazek do PDF
        const imageData = canvas.toDataURL('image/png');
        const imgWidth = 55; // szerokość obrazka w mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width; // proporcjonalna wysokość
        
        // Centrowanie obrazka
        const xPosition = (60 - imgWidth) / 2;
        
        pdf.addImage(imageData, 'PNG', xPosition, 1, imgWidth, imgHeight);
        
        // Dodajemy tekst poniżej kodu kreskowego
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
    
    // Pobierz PDF
    pdf.save('etykiety.pdf');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <FaArrowLeft className="mr-2" /> Powrót
        </button>
        <h1 className="text-2xl font-semibold">Generator etykiet z kodami kreskowymi</h1>
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            disabled={!jsBarCodeLoaded}
          >
            <FaPrint className="mr-2" /> Drukuj etykiety
          </button>
          <button
            onClick={generatePDF}
            className="flex items-center bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            disabled={!jsBarCodeLoaded}
          >
            <FaFilePdf className="mr-2" /> Etykiety jako PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Panel ustawień */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Ustawienia</h2>
          
          <div className="mb-4">
            <label className="flex items-center mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateOnePerRow}
                onChange={() => setGenerateOnePerRow(!generateOnePerRow)}
                className="form-checkbox h-5 w-5 text-blue-600 mr-2"
              />
              <span>Generuj jeden kod kreskowy dla każdego wiersza</span>
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
                  placeholder="Wprowadź dane do kodu kreskowego"
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
        
        {/* Panel podglądu */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Podgląd</h2>
          
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

      {/* Instrukcje drukowania */}
      <div className="mt-8 bg-blue-50 p-4 rounded-md">
        <h3 className="text-lg font-semibold mb-2">Instrukcje drukowania etykiet:</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Wprowadź dane do kodów kreskowych w polach powyżej.</li>
          <li>Wkładając papier etykiet do drukarki, upewnij się, że jest on prawidłowo ustawiony.</li>
          <li>Kliknij przycisk "Drukuj etykiety" i wybierz swoją drukarkę etykiet.</li>
          <li>W oknie drukowania ustaw:</li>
          <ul className="list-disc ml-8 mt-1">
            <li>Rozmiar papieru: 60mm x 30mm (lub rozmiar Twoich etykiet)</li>
            <li>Marginesy: 0mm</li>
            <li>Skala: 100% (nie dostosowuj do strony)</li>
            <li>Wyłącz opcję "Nagłówki i stopki"</li>
          </ul>
          <li>Kliknij "Drukuj".</li>
          <li>Alternatywnie, możesz użyć przycisku "Etykiety jako PDF" i wydrukować plik PDF na drukarce etykiet.</li>
        </ol>
      </div>
      
      {/* Ukryty komponent do drukowania etykiet */}
      <div style={{ display: 'none' }}>
        <div ref={printComponentRef}>
          {jsBarCodeLoaded && (
            <LabelPrintComponent
              data={barcodesData}
              generateOnePerRow={generateOnePerRow}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;