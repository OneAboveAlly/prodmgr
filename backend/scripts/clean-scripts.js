const fs = require('fs');
const path = require('path');

// Lista skryptów, które należy zachować
const scriptsToKeep = [
  'create-admin.js',
  'clean-scripts.js',
  'check-modules.js',
  'seed-leave-types.js'
];

// Ścieżka do katalogu ze skryptami
const scriptsDir = path.join(__dirname);

// Funkcja do usuwania dublikowanych skryptów
async function cleanScripts() {
  try {
    console.log('Cleaning up duplicate permission scripts...');
    
    // Pobierz listę wszystkich plików w katalogu
    const files = fs.readdirSync(scriptsDir);
    
    // Przefiltruj pliki, aby znaleźć te, które należy usunąć
    const filesToRemove = files.filter(file => {
      // Zachowaj tylko pliki JS
      if (!file.endsWith('.js')) return false;
      
      // Zachowaj pliki z listy scriptsToKeep
      if (scriptsToKeep.includes(file)) return false;
      
      // Usuń pozostałe pliki
      return true;
    });
    
    // Usuń każdy plik z listy
    for (const file of filesToRemove) {
      const filePath = path.join(scriptsDir, file);
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file}`);
    }
    
    console.log(`Cleanup complete. Removed ${filesToRemove.length} script files.`);
    console.log('All permissions are now consolidated in create-admin.js');
  } catch (error) {
    console.error('Error during script cleanup:', error);
  }
}

// Uruchom funkcję czyszczenia
cleanScripts(); 