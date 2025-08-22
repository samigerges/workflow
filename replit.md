# ImportFlow Management System

## Overview
ImportFlow is an end-to-end workflow management system designed to streamline the entire import process from initial needs assessment to final financial settlement. It provides role-based access control for various stakeholders, ensuring a comprehensive and efficient handling of goods importation. The system aims to simplify complex international trade logistics, enhance transparency, and improve operational efficiency for import businesses.

## Local Deployment Option
A complete local version has been created that removes all Replit dependencies, allowing the application to run on any local or cloud environment. Key changes include:
- Local authentication system replacing Replit Auth
- Simplified configuration without Replit-specific plugins
- Complete setup documentation for local deployment
- All core functionality maintained without external dependencies

## User Preferences
Preferred communication style: Simple, everyday language.
Reports page preferences: Focus on key quantity metrics without charts, track discharged quantities from vessels.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui (built on Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **File Uploads**: Multer for document handling

### Monorepo Structure
- `client/`: React frontend application
- `server/`: Express.js backend API
- `shared/`: Shared TypeScript schemas and types
- `migrations/`: Database migration files

### Key Features and Design Decisions
- **Role-Based Access Control**: Four distinct user roles (admin, procurement_officer, finance_officer, shipping_officer) with specific permissions.
- **Comprehensive Workflow Management**: Covers the entire import process including:
    - Statement of Needs
    - Contract Management
    - Letter of Credit processing
    - Vessel Nomination and tracking
    - Shipping Instructions
    - Loading/Discharge tracking
    - Customs Release documentation
    - Final Settlement
- **Document Management**: Local file storage for PDF, DOC, DOCX documents (max 10MB) with an approval/rejection voting system and automatic status updates based on document uploads.
- **Automatic Status Management**: 
  - Request status automatically updates to "contracted" when a contract is created
  - Request status automatically updates to "applied" when a contract is approved
  - Ensures data consistency and workflow integrity through database transactions
- **Data Visualization**: Operational analytics and KPIs displayed through interactive charts and dashboards (e.g., supplier distribution, LC metrics).
- **Type Safety**: End-to-end type safety enforced via TypeScript and Drizzle ORM, with shared schemas between frontend and backend.
- **Fully Responsive Design**: Complete mobile-first responsive implementation with:
    - MainLayout component centralizing responsive behavior across all pages
    - Mobile overlay sidebar with backdrop and smooth transitions
    - Responsive header layouts, button arrangements, and table designs
    - Proper margin adjustments when sidebar is toggled (ml-16 collapsed, ml-64 expanded on desktop, ml-0 on mobile)
    - Mobile menu button in topbar for better navigation experience
- **Consistent Error Handling**: Uniform error responses and toast notifications.
- **Terminology**: Standardized terms like "Contract Request" and "Recommend" across the application.

## External Dependencies

### Core Libraries
- **Database**: `@neondatabase/serverless`, `drizzle-orm`
- **Authentication**: `openid-client`, `passport`
- **UI Framework**: `@radix-ui/*`, `tailwindcss`
- **Forms**: `react-hook-form`, `@hookform/resolvers`
- **Validation**: `zod`
- **HTTP Client**: `@tanstack/react-query`
- **Charting**: `recharts`

### Development Tools
- **Build**: `vite`, `esbuild`
- **Type Checking**: `typescript` (strict mode)