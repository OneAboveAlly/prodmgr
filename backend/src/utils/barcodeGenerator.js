// backend/src/utils/barcodeGenerator.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generuje unikalny kod kreskowy dla różnych typów obiektów
 * @param {string} prefix - Prefiks kodu (np. 'prod' dla przewodników, 'mag' dla przedmiotów magazynowych)
 * @returns {Promise<string>} - Unikalny kod kreskowy
 */
const generateUniqueBarcode = async (prefix = '') => {
  // Ustal prefix zgodnie z typem
  let codePrefix = '';
  switch (prefix.toLowerCase()) {
    case 'prod':
      codePrefix = 'PROD';
      break;
    case 'mag':
      codePrefix = 'MAG';
      break;
    default:
      codePrefix = prefix.toUpperCase();
  }
  
  // Ustal liczbę cyfr dla części numerycznej (możliwość dostosowania)
  const numericLength = 8;
  
  // Generuj losową część numeryczną
  let isUnique = false;
  let barcode = '';
  
  while (!isUnique) {
    // Generuj numer
    const numericPart = Math.floor(Math.random() * Math.pow(10, numericLength))
      .toString()
      .padStart(numericLength, '0');
    
    barcode = `${codePrefix}${numericPart}`;
    
    // Sprawdź, czy kod jest już używany
    const existingProdGuide = await prisma.productionGuide.findUnique({
      where: { barcode }
    });
    
    const existingInventoryItem = await prisma.inventoryItem.findUnique({
      where: { barcode }
    });
    
    // Jeśli kodu nie ma w bazie, jest unikalny
    if (!existingProdGuide && !existingInventoryItem) {
      isUnique = true;
    }
  }
  
  return barcode;
};

module.exports = {
  generateUniqueBarcode
};