# Ludo Game Backend

Backend server for the Ludo Game application using Node.js, Express, and Supabase.

## Project Structure

```
backend/
├── config/
│   └── supabase.js          # Supabase client configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── userController.js    # User management logic
├── models/
│   └── User.js              # User model with database operations
├── routes/
│   ├── authRoutes.js        # Authentication routes
│   └── userRoutes.js        # User routes
├── server.js                # Main server file
├── package.json             # Dependencies
└── .env                     # Environment variables (create this)
```

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Run the server:
```bash
npm run dev  # Development mode with nodemon
# or
npm start    # Production mode
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user

### User (Protected - requires token)
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `JWT_SECRET` - Secret key for JWT tokens

