import { Router, Request, Response } from 'express';
import { DoorControlService } from '../services/DoorControlService';
import StockInOrder from '../models/StockInOrder';

const router = Router();

router.get('/warehouse/:warehouseId/check-access', async (req: Request, res: Response) => {
  try {
    const result = await DoorControlService.checkWarehouseDoorAccess(req.params.warehouseId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '检查失败', error: (error as Error).message });
  }
});

router.post('/stock-in/:orderId/check-access', async (req: Request, res: Response) => {
  try {
    const { warehouseId, operator, operatorName } = req.body;
    const result = await DoorControlService.checkStockInOrderDoorAccess(
      warehouseId,
      req.params.orderId,
      operator,
      operatorName
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '检查失败', error: (error as Error).message });
  }
});

router.post('/warehouse/:warehouseId/lock', async (req: Request, res: Response) => {
  try {
    const { fumigationPlanId } = req.body;
    const result = await DoorControlService.lockWarehouseForFumigation(
      req.params.warehouseId,
      fumigationPlanId
    );
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: '锁定失败', error: (error as Error).message });
  }
});

router.post('/warehouse/:warehouseId/unlock', async (req: Request, res: Response) => {
  try {
    const { fumigationPlanId } = req.body;
    const result = await DoorControlService.unlockWarehouseAfterFumigation(
      req.params.warehouseId,
      fumigationPlanId
    );
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: '解锁失败', error: (error as Error).message });
  }
});

router.get('/fumigating-warehouses', async (_req: Request, res: Response) => {
  try {
    const result = await DoorControlService.getFumigatingWarehouses();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

export default router;
