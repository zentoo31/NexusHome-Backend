import express from 'express';
import gpioRouter from './routes/gpio.route';

const app = express();
app.use(express.json());

app.use('/api/gpio', gpioRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
  
export default app;
