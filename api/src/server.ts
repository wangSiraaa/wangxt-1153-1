import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';

import fumigationPlansRouter from './routes/fumigationPlans';
import guardRecordsRouter from './routes/guardRecords';
import dosingRecordsRouter from './routes/dosingRecords';
import ventilationRecordsRouter from './routes/ventilationRecords';
import warehousesRouter from './routes/warehouses';
import chemicalsRouter from './routes/chemicals';
import doorControlRouter from './routes/doorControl';
import stockInOrdersRouter from './routes/stockInOrders';

dotenv.config();

const app: Express = express();
const PORT = process.env.API_PORT || 19453;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: '粮库熏蒸作业安全监护系统 API 服务正常',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/fumigation-plans', fumigationPlansRouter);
app.use('/api/guard-records', guardRecordsRouter);
app.use('/api/dosing-records', dosingRecordsRouter);
app.use('/api/ventilation-records', ventilationRecordsRouter);
app.use('/api/warehouses', warehousesRouter);
app.use('/api/chemicals', chemicalsRouter);
app.use('/api/door-control', doorControlRouter);
app.use('/api/stock-in-orders', stockInOrdersRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    success: false, 
    message: '服务器内部错误', 
    error: err.message 
  });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`\n🚀 粮库熏蒸作业安全监护系统 API 服务已启动`);
      console.log(`📡 服务地址: http://localhost:${PORT}`);
      console.log(`🔍 健康检查: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error('❌ 启动服务失败:', error);
    process.exit(1);
  }
};

startServer();
