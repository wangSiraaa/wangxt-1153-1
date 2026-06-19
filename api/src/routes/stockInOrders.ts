import { Router, Request, Response } from 'express';
import StockInOrder from '../models/StockInOrder';
import { DoorControlService } from '../services/DoorControlService';
import FumigationPlan from '../models/FumigationPlan';

const router = Router();

const generateOrderNo = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SI-${dateStr}-${random}`;
};

const BLOCKED_FUMIGATION_STATUSES = [
  'submitted',
  'safety_review_pending', 
  'safety_reviewed',
  'guard_pending',
  'guard_confirmed',
  'dosing_pending',
  'evacuation_pending',
  'dosing_completed',
  'fumigating',
  'ventilation_pending',
  'ventilating',
  'recheck_pending',
  'detection_pending',
  'detection_passed',
];

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
    orderData.orderNo = orderData.orderNo || generateOrderNo();

    const activeFumigation = await FumigationPlan.findOne({
      warehouseId: orderData.warehouseId,
      status: { $in: BLOCKED_FUMIGATION_STATUSES }
    }).sort({ createdAt: -1 });

    if (activeFumigation) {
      orderData.blockedByFumigation = true;
      orderData.blockedFumigationPlanId = activeFumigation._id.toString();
      orderData.blockedFumigationPlanNo = activeFumigation.planNo;
      orderData.blockedFumigationStatus = activeFumigation.status;
      orderData.blockedAt = new Date();
      orderData.fumigationBlockRemark = `该仓房正在熏蒸作业中[计划号: ${activeFumigation.planNo}]，普通入库单被拦截`;
      orderData.status = 'blocked';
    }

    const order = new StockInOrder(orderData);
    await order.save();

    if (order.status === 'blocked') {
      res.json({ 
        success: true, 
        data: order, 
        message: `入库单已创建但被熏蒸作业拦截：${order.fumigationBlockRemark}`,
        blocked: true,
        fumigationBlockRemark: order.fumigationBlockRemark
      });
    } else {
      res.json({ success: true, data: order, message: '入库单创建成功', blocked: false });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ success: false, message: '已完成的入库单不能修改' });
    }

    Object.assign(order, req.body);
    await order.save();

    res.json({ success: true, data: order, message: '入库单更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    if (order.status !== 'draft') {
      return res.status(400).json({ success: false, message: '只能审批草稿状态的入库单' });
    }

    const activeFumigation = await FumigationPlan.findOne({
      warehouseId: order.warehouseId,
      status: { $in: BLOCKED_FUMIGATION_STATUSES }
    }).sort({ createdAt: -1 });

    if (activeFumigation) {
      order.blockedByFumigation = true;
      order.blockedFumigationPlanId = activeFumigation._id.toString();
      order.blockedFumigationPlanNo = activeFumigation.planNo;
      order.blockedFumigationStatus = activeFumigation.status;
      order.blockedAt = new Date();
      order.fumigationBlockRemark = `该仓房正在熏蒸作业中[计划号: ${activeFumigation.planNo}]，普通入库单审批时被拦截`;
      order.status = 'blocked';
      await order.save();
      return res.status(400).json({ 
        success: false, 
        message: `审批失败：${order.fumigationBlockRemark}`,
        blocked: true,
        fumigationBlockRemark: order.fumigationBlockRemark,
        data: order
      });
    }

    const { approver, approverName } = req.body;
    order.status = 'approved';
    order.approver = approver;
    order.approverName = approverName;
    order.approvalAt = new Date();
    await order.save();

    res.json({ success: true, data: order, message: '入库单审批通过' });
  } catch (error) {
    res.status(500).json({ success: false, message: '审批失败', error: (error as Error).message });
  }
});

router.post('/:id/start-operation', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    if (order.status !== 'approved') {
      return res.status(400).json({ success: false, message: '只能开始已审批的入库单作业' });
    }

    if (order.blockedByFumigation) {
      return res.status(400).json({ 
        success: false, 
        message: `入库单被熏蒸作业拦截：${order.fumigationBlockRemark}，请等待熏蒸完成` 
      });
    }

    const { operator, operatorName } = req.body;

    const accessResult = await DoorControlService.checkStockInOrderDoorAccess(
      order.warehouseId,
      order._id.toString(),
      operator,
      operatorName
    );

    if (!accessResult.allowed) {
      return res.status(400).json({ 
        success: false, 
        message: accessResult.reason,
        blocked: true,
        doorAccessDenied: true,
        fumigationInfo: {
          fumigationPlanId: accessResult.fumigationPlanId,
          planNo: accessResult.planNo,
          status: accessResult.fumigationStatus
        }
      });
    }

    order.status = 'in_progress';
    order.operationStartAt = new Date();
    order.operator = operator;
    order.operatorName = operatorName;
    await order.save();

    res.json({ success: true, data: order, message: '入库作业已开始，可以打开仓门' });
  } catch (error) {
    res.status(500).json({ success: false, message: '开始作业失败', error: (error as Error).message });
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

    const { operator, operatorName, remark } = req.body;

    order.status = 'completed';
    order.operationCompletedAt = new Date();
    order.actualQuantity = req.body.actualQuantity || order.plannedQuantity;
    if (remark) {
      order.remark = remark;
    }
    await order.save();

    res.json({ success: true, data: order, message: '入库作业已完成' });
  } catch (error) {
    res.status(500).json({ success: false, message: '完成作业失败', error: (error as Error).message });
  }
});

router.post('/:id/check-fumigation', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    const accessResult = await DoorControlService.checkWarehouseDoorAccess(order.warehouseId);

    res.json({
      success: true,
      data: {
        canAccess: accessResult.allowed,
        reason: accessResult.reason,
        fumigationPlanId: accessResult.fumigationPlanId,
        planNo: accessResult.planNo,
        fumigationStatus: accessResult.fumigationStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '检查失败', error: (error as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const order = await StockInOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: '入库单不存在' });
    }

    if (order.status === 'in_progress' || order.status === 'completed') {
      return res.status(400).json({ success: false, message: '进行中或已完成的入库单不能删除' });
    }

    await StockInOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '入库单删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败', error: (error as Error).message });
  }
});

export default router;
