import { Router, Request, Response } from 'express';
import Warehouse from '../models/Warehouse';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const query: any = {};
    if (status) query.status = status;
    
    const warehouses = await Warehouse.find(query).sort({ code: 1 });
    res.json({ success: true, data: warehouses });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: '仓房不存在' });
    }
    res.json({ success: true, data: warehouse });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const warehouse = new Warehouse(req.body);
    await warehouse.save();
    res.json({ success: true, data: warehouse, message: '仓房创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!warehouse) {
      return res.status(404).json({ success: false, message: '仓房不存在' });
    }
    res.json({ success: true, data: warehouse, message: '仓房更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const warehouse = await Warehouse.findByIdAndDelete(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: '仓房不存在' });
    }
    res.json({ success: true, message: '仓房删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败', error: (error as Error).message });
  }
});

export default router;
