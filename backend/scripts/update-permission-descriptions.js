const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lista tłumaczeń opisów uprawnień z angielskiego na polski
const translationMap = {
  // chat permissions
  'Access chat functionality': 'Dostęp do funkcji czatu',
  
  // dashboard permissions
  'View production dashboard and analytics': 'Podgląd panelu produkcji i analityki',
  
  // leave permissions
  'Approve or reject leave requests': 'Zatwierdzanie lub odrzucanie wniosków urlopowych',
  'Create leave requests': 'Tworzenie wniosków urlopowych',
  'Delete leave requests': 'Usuwanie wniosków urlopowych',
  'Manage leave types': 'Zarządzanie typami urlopów',
  'View leave requests': 'Podgląd wniosków urlopowych',
  'Update leave requests': 'Aktualizacja wniosków urlopowych',
  'View all users leave requests': 'Podgląd wniosków urlopowych wszystkich użytkowników',
  
  // permissions management
  'Assign permissions': 'Przydzielanie uprawnień',
  'View permissions': 'Podgląd uprawnień',
  
  // roles permissions
  'Create roles': 'Tworzenie ról',
  'Delete roles': 'Usuwanie ról',
  'View roles': 'Podgląd ról',
  'Update roles': 'Aktualizacja ról',
  
  // scheduling permissions
  'Create production schedules and assignments': 'Tworzenie harmonogramów produkcji i przydziałów',
  'Delete production schedules and assignments': 'Usuwanie harmonogramów produkcji i przydziałów',
  'View production schedules': 'Podgląd harmonogramów produkcji',
  'Update production schedules and assignments': 'Aktualizacja harmonogramów produkcji i przydziałów',
  
  // time tracking permissions
  'Create time tracking sessions': 'Tworzenie sesji śledzenia czasu',
  'Delete time tracking sessions': 'Usuwanie sesji śledzenia czasu',
  'Export time tracking reports': 'Eksportowanie raportów śledzenia czasu',
  'Manage time tracking settings': 'Zarządzanie ustawieniami śledzenia czasu',
  'View time tracking': 'Podgląd śledzenia czasu',
  'Update time tracking sessions': 'Aktualizacja sesji śledzenia czasu',
  'View all users time tracking': 'Podgląd śledzenia czasu wszystkich użytkowników',
  'View time tracking reports': 'Podgląd raportów śledzenia czasu',
  
  // users permissions
  'Create users': 'Tworzenie użytkowników',
  'Delete users': 'Usuwanie użytkowników',
  'View users': 'Podgląd użytkowników',
  'Update users': 'Aktualizacja użytkowników',
  
  // quality permissions
  'Create quality check templates and perform quality checks': 'Tworzenie szablonów kontroli jakości i przeprowadzanie kontroli',
  'View quality check templates and results': 'Podgląd szablonów kontroli jakości i wyników',
  'Update quality check templates': 'Aktualizacja szablonów kontroli jakości',
  'Delete quality check templates': 'Usuwanie szablonów kontroli jakości',
};

async function updatePermissionDescriptions() {
  try {
    // Pobierz wszystkie uprawnienia z bazy danych
    const permissions = await prisma.permission.findMany();
    console.log(`Znaleziono ${permissions.length} uprawnień w bazie danych.`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Aktualizuj opisy dla każdego uprawnienia
    for (const permission of permissions) {
      // Jeśli opis jest w angielskim i mamy tłumaczenie, aktualizuj
      if (permission.description && translationMap[permission.description]) {
        const polishDescription = translationMap[permission.description];
        
        await prisma.permission.update({
          where: { id: permission.id },
          data: { description: polishDescription }
        });
        
        console.log(`Zaktualizowano: ${permission.module}.${permission.action}: "${permission.description}" -> "${polishDescription}"`);
        updatedCount++;
      } else {
        // Jeśli nie ma opisu lub nie mamy tłumaczenia, pomijamy
        console.log(`Pominięto: ${permission.module}.${permission.action}: "${permission.description || 'brak opisu'}"`);
        skippedCount++;
      }
    }
    
    console.log('\nPodsumowanie:');
    console.log(`- Zaktualizowano: ${updatedCount} opisów uprawnień`);
    console.log(`- Pominięto: ${skippedCount} opisów uprawnień`);
    console.log('\nAby zobaczyć zaktualizowane uprawnienia, odśwież stronę uprawnień w aplikacji.');
    
  } catch (error) {
    console.error('Wystąpił błąd podczas aktualizacji opisów uprawnień:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Uruchom funkcję aktualizującą
updatePermissionDescriptions(); 