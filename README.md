# Production Manager

System do zarządzania produkcją z kompleksowymi funkcjami śledzenia procesów produkcyjnych, zarządzania użytkownikami, kontroli jakości i planowania.

## O projekcie

Ten projekt został stworzony jako część portfolio, demonstrujący umiejętności w zakresie:
- Full-stack development (Node.js, React)
- Zarządzania bazą danych (PostgreSQL)
- Implementacji systemów autentykacji
- Tworzenia interfejsów użytkownika
- Integracji różnych technologii i bibliotek

### Proces tworzenia
Projekt został zbudowany przy współpracy z AI, gdzie:
- AI pomagało w generowaniu kodu i sugerowaniu rozwiązań
- Każda część kodu była analizowana i modyfikowana
- Implementacja była dostosowywana do specyficznych potrzeb
- Uczyłem się nowych koncepcji i rozwiązań podczas procesu

## Architektura projektu

### Backend
- **Framework**: Node.js z Express
- **Baza danych**: PostgreSQL z ORM Prisma
- **Autentykacja**: JWT z tokenami dostępu i odświeżania
- **Komunikacja w czasie rzeczywistym**: Socket.IO
- **Planowanie zadań**: node-cron

### Frontend
- **Framework**: React z Vite
- **Routing**: React Router
- **Zarządzanie stanem**: React Query
- **Stylowanie**: Tailwind CSS
- **Wizualizacja danych**: Recharts
- **Drag & Drop**: @dnd-kit/core
- **Powiadomienia**: react-toastify
- **Formularze**: react-hook-form

## Wymagania systemowe

- Node.js (v14 lub wyższy)
- PostgreSQL
- npm lub yarn

## Uruchamianie projektu

### Konfiguracja backendu

1. Przejdź do katalogu backendu:
   ```
   cd backend
   ```

2. Zainstaluj zależności:
   ```
   npm install
   ```

3. Utwórz plik `.env` w katalogu backend z następującymi zmiennymi:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/production_manager"
   JWT_SECRET="twoj-klucz-tajny-jwt"
   JWT_REFRESH_SECRET="twoj-klucz-tajny-jwt-refresh"
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```

4. Zastosuj migracje bazy danych:
   ```
   npx prisma migrate dev
   ```

5. Zainicjuj bazę danych z danymi początkowymi (role, uprawnienia i admin):
   ```
   npm run create-admin
   ```

6. Uruchom serwer deweloperski:
   ```
   npm run dev
   ```

### Konfiguracja frontendu

1. Przejdź do katalogu frontendu:
   ```
   cd frontend-vite
   ```

2. Zainstaluj zależności:
   ```
   npm install
   ```

3. Uruchom serwer deweloperski:
   ```
   npm run dev
   ```

4. Otwórz przeglądarkę i przejdź do `http://localhost:5173`

## Domyślne dane logowania administratora

- **Login**: admin
- **Hasło**: admin123

**Ważne:** Zmień domyślne hasło po pierwszym logowaniu ze względów bezpieczeństwa.

## Główne funkcje systemu

### Zarządzanie użytkownikami i uprawnieniami
- Kontrola dostępu oparta na rolach (RBAC)
- Zarządzanie uprawnieniami dla różnych modułów
- Śledzenie aktywności użytkowników

### Śledzenie czasu pracy
- Rejestrowanie sesji pracy
- Zarządzanie przerwami
- Raportowanie czasu pracy

### Zarządzanie nieobecnościami
- Różne typy nieobecności (płatne/niepłatne)
- Obsługa wniosków urlopowych
- Kalendarz nieobecności

### Produkcja
- Definiowanie przewodników produkcyjnych
- Zarządzanie krokami produkcyjnymi
- Przypisywanie zadań
- Monitorowanie postępu produkcji
- Wykresy i statystyki produkcyjne

### Kontrola jakości
- Szablony kontroli jakości
- Inspekcje jakości z raportowaniem
- Śledzenie problemów jakościowych

### Harmonogramowanie produkcji
- Planowanie zadań produkcyjnych
- Przydzielanie zasobów
- Wizualizacja harmonogramu

### Inwentaryzacja
- Zarządzanie zapasami
- Śledzenie zużycia materiałów
- Transakcje magazynowe

### Komunikacja
- System wiadomości między użytkownikami
- Powiadomienia w czasie rzeczywistym
- Komentarze do zadań produkcyjnych

### Dodatkowe funkcje
- Rozpoznawanie tekstu (OCR)
- Dziennik audytu dla zmian systemowych
- Eksport danych do Excel/CSV

## Technologie

### Backend
- Node.js i Express
- Prisma ORM
- PostgreSQL
- JWT
- Socket.IO
- multer (obsługa plików)
- tesseract.js (OCR)
- bcrypt (haszowanie haseł)
- node-cron (zadania cykliczne)

### Frontend
- React 19
- React Router 7
- React Query
- Tailwind CSS
- Recharts
- Socket.IO Client
- React Hook Form
- React Toastify
- DND Kit (drag and drop)
- ExcelJS i XLSX (eksport danych)

## Struktura projektu

### Backend
- `/controllers` - logika obsługi żądań HTTP
- `/routes` - definicje tras API
- `/middleware` - middleware Express
- `/services` - logika biznesowa
- `/utils` - funkcje pomocnicze
- `/prisma` - definicja schematu bazy danych
- `/sockets` - obsługa komunikacji Socket.IO
- `/scripts` - skrypty pomocnicze

### Frontend
- `/src/pages` - komponenty stron
- `/src/components` - komponenty wielokrotnego użytku
- `/src/contexts` - konteksty React
- `/src/api` - integracja z API
- `/src/utils` - funkcje pomocnicze
- `/src/services` - logika biznesowa
- `/src/routes` - konfiguracja routingu
- `/src/assets` - zasoby statyczne

## Plany rozwoju

Projekt jest w ciągłym rozwoju. Planowane ulepszenia:

### Najbliższe plany
- Poprawa interfejsu użytkownika
- Dodanie nowych raportów
- Rozbudowa systemu powiadomień
- Optymalizacja wydajności

### Dalsze plany
- Integracja z systemami ERP
- Rozbudowa modułu planowania
- Dodanie mobilnej wersji
- Rozszerzenie API