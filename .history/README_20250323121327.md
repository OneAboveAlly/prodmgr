# Production Manager

A comprehensive production management system with authentication, user management, and a modern UI.

## Project Structure

- **Backend**: Node.js/Express API with PostgreSQL database (using Prisma ORM)
- **Frontend**: React application with Tailwind CSS

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

## Getting Started

### Backend Setup

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
   PORT=3000
   ```

4. Apply database migrations:
   ```
   npx prisma migrate dev
   ```

5. Seed the database with initial data (roles, permissions, and admin user):
   ```
   npm run create-admin
   ```

6. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the frontend directory:
   ```
   REACT_APP_API_URL=http://localhost:3000/api
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Default Admin Credentials

- **Login**: admin
- **Password**: admin123

**Important:** Change the default password after your first login for security reasons.

## Features

- **Authentication**: JWT-based authentication with access and refresh tokens
- **User Management**: Create, update, and delete users
- **Role-Based Access Control**: Define permissions for different user roles
- **Dashboard**: Overview of production metrics with charts
- **Modern UI**: Responsive design using Tailwind CSS

## Technology Stack

- **Backend**:
  - Node.js and Express
  - Prisma ORM for database access
  - PostgreSQL database
  - JWT for authentication
  - Socket.IO for real-time updates

- **Frontend**:
  - React for UI components
  - React Router for navigation
  - React Query for data fetching
  - Tailwind CSS for styling
  - Recharts for data visualization

## Next Steps

1. Implement additional feature modules as specified in your requirements
2. Create unit and integration tests
3. Set up CI/CD pipeline for automated deployments
4. Enhance security measures
5. Add comprehensive documentation for API endpoints