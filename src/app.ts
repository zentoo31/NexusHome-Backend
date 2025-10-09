import express from 'express';
import ledRouter from './routes/led.route';

const app = express();
app.use(express.json());

app.use('/api/led', ledRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
  
export default app;
