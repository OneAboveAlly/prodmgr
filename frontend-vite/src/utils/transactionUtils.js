/**
 * Plik zawierający funkcje pomocnicze do obsługi transakcji magazynowych
 */

/**
 * Zwraca informacje o wyświetlaniu typu transakcji
 * @param {string} type - Typ transakcji
 * @returns {Object} - Obiekt zawierający nazwę, kolor, emoji i opis typu transakcji
 */
export const getTransactionTypeInfo = (type) => {
  // Normalizujemy typ transakcji do wielkich liter dla spójności
  const normalizedType = type?.toUpperCase() || '';
  
  switch (normalizedType) {
    case 'ADD':
      return { 
        text: 'Dodanie', 
        color: 'text-green-600',
        emoji: '➕',
        fullText: '➕ Dodanie',
        description: 'Dodanie przedmiotów do magazynu'
      };
    case 'REMOVE':
      return { 
        text: 'Pobranie', 
        color: 'text-red-600',
        emoji: '➖',
        fullText: '➖ Pobranie',
        description: 'Standardowe pobranie przedmiotów'
      };
    case 'REMOVE_RESERVED':
      return { 
        text: 'Pobranie zarezerwowanych', 
        color: 'text-orange-600',
        emoji: '🔓➖',
        fullText: '🔓➖ Pobranie zarezerwowanych',
        description: 'Pobranie przedmiotów zarezerwowanych'
      };
    case 'FORCE_REMOVE':
      return { 
        text: 'Pobranie wymuszone', 
        color: 'text-red-700',
        emoji: '⚠️',
        fullText: '⚠️ Pobranie wymuszone',
        description: 'Wymuszone pobranie przedmiotów'
      };
    case 'FORCE':
      return { 
        text: 'Wymuszenie', 
        color: 'text-red-700',
        emoji: '⚠️',
        fullText: '⚠️ Wymuszenie',
        description: 'Ogólne wymuszenie operacji'
      };
    case 'RESERVE':
      return { 
        text: 'Rezerwacja', 
        color: 'text-blue-600',
        emoji: '🔒',
        fullText: '🔒 Rezerwacja',
        description: 'Rezerwacja przedmiotów do produkcji'
      };
    case 'RELEASE':
      return { 
        text: 'Zwolnienie rezerwacji', 
        color: 'text-blue-500',
        emoji: '🔓',
        fullText: '🔓 Zwolnienie rezerwacji',
        description: 'Zwolnienie zarezerwowanych przedmiotów'
      };
    case 'RETURN':
      return { 
        text: 'Zwrot', 
        color: 'text-green-500',
        emoji: '↩️',
        fullText: '↩️ Zwrot',
        description: 'Zwrot niewykorzystanych przedmiotów'
      };
    case 'ISSUE':
      return { 
        text: 'Wydanie do produkcji', 
        color: 'text-purple-600',
        emoji: '📦',
        fullText: '📦 Wydanie do produkcji',
        description: 'Wydanie przedmiotów do produkcji'
      };
    case 'ADJUST':
      return { 
        text: 'Korekta ilości', 
        color: 'text-yellow-600',
        emoji: '🔄',
        fullText: '🔄 Korekta ilości',
        description: 'Zmiana ilości przedmiotów w magazynie'
      };
    default:
      return { 
        text: type || 'Nieznany', 
        color: 'text-gray-600',
        emoji: '❓',
        fullText: type || 'Nieznany',
        description: 'Nieznany typ transakcji'
      };
  }
};

/**
 * Zwraca listę wszystkich obsługiwanych typów transakcji
 * @returns {Array} - Lista typów transakcji z ich opisami
 */
export const getAllTransactionTypes = () => {
  return [
    { type: 'ADD', ...getTransactionTypeInfo('ADD') },
    { type: 'REMOVE', ...getTransactionTypeInfo('REMOVE') },
    { type: 'REMOVE_RESERVED', ...getTransactionTypeInfo('REMOVE_RESERVED') },
    { type: 'FORCE_REMOVE', ...getTransactionTypeInfo('FORCE_REMOVE') },
    { type: 'FORCE', ...getTransactionTypeInfo('FORCE') },
    { type: 'RESERVE', ...getTransactionTypeInfo('RESERVE') },
    { type: 'RELEASE', ...getTransactionTypeInfo('RELEASE') },
    { type: 'ISSUE', ...getTransactionTypeInfo('ISSUE') },
    { type: 'RETURN', ...getTransactionTypeInfo('RETURN') },
    { type: 'ADJUST', ...getTransactionTypeInfo('ADJUST') }
  ];
};

/**
 * Grupuje typy transakcji do wyświetlenia w selekcie
 * @returns {Object} - Obiekt zawierający grupy typów transakcji
 */
export const getTransactionTypeGroups = () => {
  return {
    "Dodawanie i pobieranie": [
      { type: 'ADD', ...getTransactionTypeInfo('ADD') },
      { type: 'REMOVE', ...getTransactionTypeInfo('REMOVE') },
      { type: 'REMOVE_RESERVED', ...getTransactionTypeInfo('REMOVE_RESERVED') },
      { type: 'FORCE_REMOVE', ...getTransactionTypeInfo('FORCE_REMOVE') }
    ],
    "Rezerwacje": [
      { type: 'RESERVE', ...getTransactionTypeInfo('RESERVE') },
      { type: 'RELEASE', ...getTransactionTypeInfo('RELEASE') }
    ],
    "Pozostałe operacje": [
      { type: 'FORCE', ...getTransactionTypeInfo('FORCE') },
      { type: 'ISSUE', ...getTransactionTypeInfo('ISSUE') },
      { type: 'RETURN', ...getTransactionTypeInfo('RETURN') },
      { type: 'ADJUST', ...getTransactionTypeInfo('ADJUST') }
    ]
  };
};

/**
 * Tłumaczy typ transakcji na tekst
 * @param {string} type - Typ transakcji
 * @returns {string} - Przetłumaczony tekst
 */
export const translateTransactionType = (type) => {
  const typeInfo = getTransactionTypeInfo(type);
  return typeInfo.fullText;
}; 