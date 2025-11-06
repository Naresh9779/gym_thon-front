import app from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';

async function start() {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => {
      console.log(`🚀 FitFlow API listening on http://localhost:${ENV.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
