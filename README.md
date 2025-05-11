# Production Manager

[English](#english) | [Polski](#polski)

<a name="english"></a>
## English

### About the Project

Production Manager is a comprehensive system for managing manufacturing processes with features for production tracking, user management, quality control, and planning.

### Demo Video
[Watch the demo video](https://www.youtube.com/watch?v=id3D_0ASKs4)

### Development Process

The entire concept, architecture, and functionality of the system was planned independently by me. For the implementation, I utilized AI tools that supported code generation and suggested solutions. My task was to supervise the process, verify functionality, and adapt the implementation to the system requirements.

I provided detailed instructions to AI in agent mode about what functionality needed to be implemented, and the AI generated the code. I then reviewed what worked, provided feedback on what needed to be fixed, and maintained the overall vision of the project while AI handled the code writing, file structure, etc.

### Project Architecture

#### Backend
- **Framework**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with access and refresh tokens
- **Real-time Communication**: Socket.IO
- **Task Scheduling**: node-cron

#### Frontend
- **Framework**: React with Vite
- **Routing**: React Router
- **State Management**: React Query
- **Styling**: Tailwind CSS
- **Data Visualization**: Recharts
- **Drag & Drop**: @dnd-kit/core
- **Notifications**: react-toastify
- **Forms**: react-hook-form

### System Requirements

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Running the Project

#### Backend Configuration

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/production_manager"
   JWT_SECRET="your-jwt-secret-key"
   JWT_REFRESH_SECRET="your-jwt-refresh-secret-key"
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```

   > **Note:** The above values are examples. In particular, JWT secrets and database credentials should be changed to your own, unique, and secure values! Do not use default values in a production environment.

4. Apply database migrations:
   ```
   npx prisma migrate dev
   ```

5. Initialize the database with initial data:
   ```
   npm run create-admin
   ```

6. Run the development server:
   ```
   npm run dev
   ```

#### Frontend Configuration

1. Navigate to the frontend directory:
   ```
   cd frontend-vite
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Open a browser and go to `http://localhost:5173`

### Default Administrator Login

- **Login**: admin
- **Password**: admin123

**Important:** Change the default password after your first login.

### Main System Features

- User and Permission Management
- Work Time Tracking
- Absence Management
- Production Management
- Quality Control
- Production Scheduling
- Inventory Management
- Communication
- Data Export to Excel/CSV

---

<a name="polski"></a>
## Polski

### O projekcie

System do zarządzania produkcją z kompleksowymi funkcjami śledzenia procesów produkcyjnych, zarządzania użytkownikami, kontroli jakości i planowania.

### Film prezentacyjny
[Obejrzyj film prezentacyjny](https://www.youtube.com/watch?v=id3D_0ASKs4)

### Proces rozwoju

Całość koncepcji, architektury i funkcjonalności systemu została zaplanowana samodzielnie. Do realizacji implementacji wykorzystywałem narzędzia AI, które wspierały generowanie kodu i sugerowały rozwiązania. Moim zadaniem było nadzorowanie procesu, weryfikacja działania oraz dostosowywanie implementacji do wymagań systemu.

Dostarczałem szczegółowe instrukcje do AI w trybie agenta dotyczące tego, jakie funkcjonalności należy zaimplementować, a AI generowała kod. Następnie sprawdzałem, co działało, przekazywałem informacje zwrotne o tym, co należało poprawić, i utrzymywałem ogólną wizję projektu, podczas gdy AI zajmowała się pisaniem kodu, strukturą plików itp.

### Architektura projektu

#### Backend
- **Framework**: Node.js z Express
- **Baza danych**: PostgreSQL z ORM Prisma
- **Autentykacja**: JWT z tokenami dostępu i odświeżania
- **Komunikacja w czasie rzeczywistym**: Socket.IO
- **Planowanie zadań**: node-cron

#### Frontend
- **Framework**: React z Vite
- **Routing**: React Router
- **Zarządzanie stanem**: React Query
- **Stylowanie**: Tailwind CSS
- **Wizualizacja danych**: Recharts
- **Drag & Drop**: @dnd-kit/core
- **Powiadomienia**: react-toastify
- **Formularze**: react-hook-form

### Wymagania systemowe

- Node.js (v14 lub wyższy)
- PostgreSQL
- npm lub yarn

### Uruchamianie projektu

#### Konfiguracja backendu

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

#### Konfiguracja frontendu

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

### Domyślne dane logowania administratora

- **Login**: admin
- **Hasło**: admin123

**Ważne:** Zmień domyślne hasło po pierwszym logowaniu.

### Główne funkcje systemu

- Zarządzanie użytkownikami i uprawnieniami
- Śledzenie czasu pracy
- Zarządzanie nieobecnościami
- Produkcja
- Kontrola jakości
- Harmonogramowanie produkcji
- Inwentaryzacja
- Komunikacja
- Eksport danych do Excel/CSV