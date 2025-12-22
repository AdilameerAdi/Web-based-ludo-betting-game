import express from 'express';
import { createTable, getWaitingTables, getTableById, joinTable } from '../controllers/tableController.js';
import { verifyToken } from '../controllers/authController.js';

const router = express.Router();

// All table routes require authentication
router.use(verifyToken);

// POST /api/tables - Create a new custom table
router.post('/', createTable);

// GET /api/tables/waiting - Get all waiting tables
router.get('/waiting', getWaitingTables);

// GET /api/tables/:tableId - Get table by ID
router.get('/:tableId', getTableById);

// POST /api/tables/:tableId/join - Join a table
router.post('/:tableId/join', joinTable);

export default router;

