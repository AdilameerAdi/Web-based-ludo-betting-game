# Custom Table Feature Implementation

## Overview
This document describes the custom table feature that allows users to create their own betting tables with real-time updates using Socket.io.

## Features Implemented

### 1. Custom Table Creation Form
- **Location**: `src/components/CustomTableForm.jsx`
- **Features**:
  - Displays user's available balance
  - Input field for bet amount
  - Validation (checks balance, positive amount)
  - Create button
  - Real-time table creation via Socket.io

### 2. Waiting Room
- **Location**: `src/components/WaitingRoom.jsx`
- **Features**:
  - Displays all available custom tables in real-time
  - Shows bet amount, player count, and table status
  - Join table functionality
  - Share table link button
  - Real-time updates when tables are created/updated

### 3. Backend Socket.io Server
- **Location**: `backend/server.js`
- **Events**:
  - `join_waiting_room` - Join waiting room to receive updates
  - `create_table` - Create a new custom table
  - `join_table` - Join a specific table
  - `tables_update` - Broadcast table list updates
  - `table_created` - Notify when new table is created
  - `table_updated` - Notify when table is updated
  - `table_removed` - Notify when table is removed

### 4. Backend API Routes
- **Location**: `backend/routes/tableRoutes.js` and `backend/controllers/tableController.js`
- **Endpoints**:
  - `POST /api/tables` - Create a new custom table
  - `GET /api/tables/waiting` - Get all waiting tables
  - `GET /api/tables/:tableId` - Get table by ID
  - `POST /api/tables/:tableId/join` - Join a table

## Database Setup Required

You need to create a `tables` table in Supabase with the following schema:

```sql
CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  creator_id UUID REFERENCES users(id),
  bet_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'active', 'completed'
  players UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Also, ensure the `users` table has a `balance` column:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0;
```

## How It Works

1. **Creating a Table**:
   - User clicks "Custom Table" button
   - CustomTableForm component opens
   - User enters bet amount
   - Form validates balance
   - Table is created via API
   - Socket.io broadcasts to all users in waiting room
   - User is redirected to waiting room

2. **Real-time Updates**:
   - All users in waiting room receive real-time updates
   - When a table is created, all users see it immediately
   - When a player joins, the player count updates in real-time
   - Tables are removed when full or game starts

3. **Sharing Table Links**:
   - Each table has a unique link: `/table/{tableId}`
   - Users can copy the link to share with others
   - Link can be used to join the table directly

## Environment Variables

Make sure your `.env` file in the backend has:
```
FRONTEND_URL=http://localhost:5173
```

## Usage

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Users can now:
   - Create custom tables with their desired bet amount
   - See all available tables in the waiting room
   - Join tables in real-time
   - Share table links with others

## Notes

- Tables are stored in both database (persistent) and memory (for real-time updates)
- Socket.io handles real-time communication
- Balance is checked before table creation and joining
- Tables support up to 4 players
- Table status can be: 'waiting', 'active', or 'completed'

