import { Request, Response, NextFunction } from 'express';
import { connectDB } from '../config/db';

/**
 * Middleware to ensure MongoDB connection is established before handling requests.
 * Critical for serverless environments (Vercel, AWS Lambda, etc.) where
 * cold starts may occur and the database connection needs to be established
 * on-demand for each request.
 */
export async function ensureDbConnection(req: Request, res: Response, next: NextFunction) {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({
      ok: false,
      error: { message: 'Service temporarily unavailable. Please try again.' }
    });
  }
}
