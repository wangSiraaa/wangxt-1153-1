import { Router, Request, Response } from 'express';
import FumigationPlan, { FumigationStatus, IFumigationPlan } from '../models/FumigationPlan';
import { BusinessRuleService } from '../services/BusinessRuleService';
import { DoorControlService } from '../services/DoorControlService';
import GuardRecord from '../models/GuardRecord';
import DosingRecord from '../models/DosingRecord';
import VentilationRecord from '../models/VentilationRecord';

const router = Router();

const generatePlanNo = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `FUM-${dateStr}-${random}`;
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, warehouseId, page = '1', pageSize = '10' } = req.query;
    const query: any = {};
    
    if (status) query.status = status;
    if (warehouseId) query.warehouseId = warehouseId;

    const plans = await FumigationPlan.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize));
    
    const total = await FumigationPlan.countDocuments(query);

    res.json({
      success: true,
      data: plans,
      pagination: { page: Number(page), pageSize: Number(pageSize), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await FumigationPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const planData = req.body;
    planData.planNo = generatePlanNo();
    planData.status = 'draft' as FumigationStatus;
    planData.statusHistory = [{
      status: 'draft' as FumigationStatus,
      operator: planData.storageOperator,
      operatorName: planData.storageOperatorName,
      timestamp: new Date(),
      remark: '创建熏蒸计划'
    }];

    const plan = new FumigationPlan(planData);
    await plan.save();

    res.json({ success: true, data: plan, message: '熏蒸计划创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await FumigationPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    if (plan.status !== 'draft') {
      return res.status(400).json({ success: false, message: '只能修改草稿状态的计划' });
    }

    Object.assign(plan, req.body);
    await plan.save();

    res.json({ success: true, data: plan, message: '熏蒸计划更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const plan = await FumigationPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    const { operator, operatorName } = req.body;
    const validation = await BusinessRuleService.validateStatusTransition(
      plan.status,
      'submitted',
      plan._id.toString()
    );

    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    plan.status = 'submitted';
    plan.statusHistory.push({
      status: 'submitted',
      operator,
      operatorName,
      timestamp: new Date(),
      remark: '仓储员提交熏蒸计划'
    });
    await plan.save();

    res.json({ success: true, data: plan, message: '熏蒸计划提交成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '提交失败', error: (error as Error).message });
  }
});

router.post('/:id/start-process', async (req: Request, res: Response) => {
  try {
    const plan = await FumigationPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    const { operator, operatorName } = req.body;

    const doorLockResult = await DoorControlService.lockWarehouseForFumigation(
      plan.warehouseId,
      plan._id.toString()
    );

    if (!doorLockResult.success) {
      return res.status(400).json({ success: false, message: doorLockResult.message });
    }

    plan.status = 'guard_pending';
    plan.actualStartDate = new Date();
    plan.statusHistory.push({
      status: 'guard_pending',
      operator,
      operatorName,
      timestamp: new Date(),
      remark: `开始熏蒸流程，${doorLockResult.message}`
    });
    await plan.save();

    res.json({ success: true, data: plan, message: '熏蒸流程已启动，仓房已锁定' });
  } catch (error) {
    res.status(500).json({ success: false, message: '启动失败', error: (error as Error).message });
  }
});

router.post('/:id/transition/:targetStatus', async (req: Request, res: Response) => {
  try {
    const plan = await FumigationPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    const { operator, operatorName, remark } = req.body;
    const targetStatus = req.params.targetStatus as FumigationStatus;

    const validation = await BusinessRuleService.validateStatusTransition(
      plan.status,
      targetStatus,
      plan._id.toString()
    );

    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const statusRemarks: Record<string, string> = {
      'guard_confirmed': '安环员确认警戒和通风条件',
      'dosing_pending': '进入投药准备阶段',
      'evacuation_pending': '开始人员撤离',
      'dosing_completed': '完成投药作业',
      'fumigating': '进入熏蒸密闭阶段',
      'ventilation_pending': '进入通风准备阶段',
      'ventilating': '开始通风散气',
      'detection_pending': '进入气体检测阶段',
      'detection_passed': '气体检测达标',
      'guard_released': '解除警戒'
    };

    if (targetStatus === 'guard_released') {
      const unlockResult = await DoorControlService.unlockWarehouseAfterFumigation(
        plan.warehouseId,
        plan._id.toString()
      );
      if (!unlockResult.success) {
        return res.status(400).json({ success: false, message: unlockResult.message });
      }
    }

    if (targetStatus === 'completed') {
      plan.actualEndDate = new Date();
    }

    plan.status = targetStatus;
    plan.statusHistory.push({
      status: targetStatus,
      operator,
      operatorName,
      timestamp: new Date(),
      remark: remark || statusRemarks[targetStatus] || `状态变更为${targetStatus}`
    });
    await plan.save();

    res.json({ success: true, data: plan, message: `状态已更新为${targetStatus}` });
  } catch (error) {
    res.status(500).json({ success: false, message: '状态转换失败', error: (error as Error).message });
  }
});

router.get('/:id/details', async (req: Request, res: Response) => {
  try {
    const plan = await FumigationPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    const [guardRecord, dosingRecord, ventilationRecord] = await Promise.all([
      GuardRecord.findOne({ fumigationPlanId: plan._id }),
      DosingRecord.findOne({ fumigationPlanId: plan._id }),
      VentilationRecord.findOne({ fumigationPlanId: plan._id })
    ]);

    res.json({
      success: true,
      data: {
        plan,
        guardRecord,
        dosingRecord,
        ventilationRecord
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await FumigationPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    if (plan.status !== 'draft') {
      return res.status(400).json({ success: false, message: '只能删除草稿状态的计划' });
    }

    await FumigationPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '熏蒸计划删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败', error: (error as Error).message });
  }
});

export default router;
