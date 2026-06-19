import { Router, Request, Response } from 'express';
import StockInOrder from '../models/StockInOrder';
import { DoorControlService } from '../services/DoorControlService';

const router = Router();

const generateOrderNo = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SI-${dateStr}-${random}`;
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, warehouseId, page = '1', pageSize = '10' } = req.query;
    const query: any = {};
    
    if (status) query.status = status;
    if (warehouseId) query.warehouseId = warehouseId;

    const orders = await StockInOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize));
    
    const total = await StockInOrder.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: { page: Number(page), pageSize: Number(pageSize), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    orderData.orderNo = generateOrderNo();
    orderData.status = 'draft';

    const order = new StockInOrder(orderData);
    await order.save();

    res.json({ success: true, data: order, message: '入库单创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.post('/:id/access-door', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    const { operator, operatorName } = req.body;

    const accessResult = await DoorControlService.checkStockInOrderDoorAccess(
      order.warehouseId,
      order._id.toString(),
      operator,
      operatorName
    );

    if (!accessResult.allowed) {
      return res.status(403).json({ 
        success: false, 
        message: accessResult.reason,
        data: accessResult
      });
    }

    order.status = 'in_progress';
    await order.save();

    res.json({ 
      success: true, 
      data: { order, accessResult }, 
      message: '仓门开启成功，可以进行入库作业' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败', error: (error as Error).message });
  }
});

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    if (order.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: '只能完成进行中的入库单' });
    }

    order.status = 'completed';
    await order.save();

    res.json({ success: true, data: order, message: '入库单已完成' });
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败', error: (error as Error).message });
  }
});

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ success: false, message: '已完成的入库单不能取消' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({ success: true, data: order, message: '入库单已取消' });
  } catch (error) {
    res.status(500).json({ success: false, message: '操作失败', error: (error as Error).message });
  }
});

export default router;
