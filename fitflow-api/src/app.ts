import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env';
import api from './routes';
import { errorHandler, notFound } from './middleware/errors';

const app = express();

app.use(helmet());
app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: {
        message: 'Too many requests from this IP, please try again later.'
      }
    });
  }
});
// app.use(limiter);

app.get('/', (_req, res) => res.json({ ok: true, data: { name: 'FitFlow API' } }));
app.use('/api', api);

app.use(notFound);
app.use(errorHandler);

export default app;
