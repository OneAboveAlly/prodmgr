# Production Manager

System do zarządzania produkcją z kompleksowymi funkcjami śledzenia procesów produkcyjnych, zarządzania użytkownikami, kontroli jakości i planowania.

## O projekcie

Całość koncepcji, architektury i funkcjonalności systemu została zaplanowana samodzielnie. Do realizacji implementacji wykorzystywałem narzędzia AI, które wspierały generowanie kodu i sugerowały rozwiązania. Moim zadaniem było nadzorowanie procesu, weryfikacja działania oraz dostosowywanie implementacji do wymagań systemu.

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

   > **Uwaga:** Powyższe wartości są przykładowe. W szczególności sekrety JWT oraz dane dostępowe do bazy powinny być zmienione na własne, unikalne i bezpieczne! Nie używaj domyślnych wartości w środowisku produkcyjnym.

4. Zastosuj migracje bazy danych:
   ```
   npx prisma migrate dev
   ```

5. Zainicjuj bazę danych z danymi początkowymi:
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

**Ważne:** Zmień domyślne hasło po pierwszym logowaniu.

## Główne funkcje systemu

### Zarządzanie użytkownikami i uprawnieniami
- Kontrola dostępu oparta na rolach (RBAC)
- Zarządzanie uprawnieniami
- Śledzenie aktywności użytkowników

### Śledzenie czasu pracy
- Rejestrowanie sesji pracy
- Zarządzanie przerwami
- Raportowanie czasu pracy

### Zarządzanie nieobecnościami
- Różne typy nieobecności
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
- Inspekcje jakości
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
- System wiadomości
- Powiadomienia w czasie rzeczywistym
- Komentarze do zadań

### Dodatkowe funkcje
- Rozpoznawanie tekstu (OCR) – dostępne w kodzie, nieużywane w bieżącej wersji
- Dziennik audytu
- Eksport danych do Excel/CSV