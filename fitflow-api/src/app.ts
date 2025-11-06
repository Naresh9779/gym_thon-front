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

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.get('/', (_req, res) => res.json({ ok: true, data: { name: 'FitFlow API' } }));
app.use('/api', api);

app.use(notFound);
app.use(errorHandler);

export default app;
