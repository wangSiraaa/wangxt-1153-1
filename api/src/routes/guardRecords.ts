import { Router, Request, Response } from 'express';
import GuardRecord from '../models/GuardRecord';
import FumigationPlan from '../models/FumigationPlan';
import { BusinessRuleService } from '../services/BusinessRuleService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { fumigationPlanId } = req.query;
    const query: any = {};
    if (fumigationPlanId) query.fumigationPlanId = fumigationPlanId;
    
    const records = await GuardRecord.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await GuardRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '警戒记录不存在' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { fumigationPlanId } = req.body;
    
    const existing = await GuardRecord.findOne({ fumigationPlanId });
    if (existing) {
      return res.status(400).json({ success: false, message: '该熏蒸计划已存在警戒记录' });
    }

    const plan = await FumigationPlan.findById(fumigationPlanId);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    if (plan.status !== 'guard_pending') {
      return res.status(400).json({ success: false, message: `当前状态[${plan.status}]不允许创建警戒记录` });
    }

    const record = new GuardRecord(req.body);
    await record.save();

    plan.guardRecordId = record._id.toString();
    plan.safetyOfficer = record.safetyOfficer;
    plan.safetyOfficerName = record.safetyOfficerName;
    await plan.save();

    res.json({ success: true, data: record, message: '警戒记录创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const record = await GuardRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '警戒记录不存在' });
    }

    if (record.guardConfirmedAt) {
      return res.status(400).json({ success: false, message: '已确认的警戒记录不能修改' });
    }

    Object.assign(record, req.body);
    await record.save();

    res.json({ success: true, data: record, message: '警戒记录更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const record = await GuardRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '警戒记录不存在' });
    }

    if (record.guardConfirmedAt) {
      return res.status(400).json({ success: false, message: '警戒记录已确认' });
    }

    const { warningSigns, ventilationFacility, evacuationRoute, emergencyEquipment } = record;
    if (!warningSigns || !ventilationFacility || !evacuationRoute || !emergencyEquipment) {
      return res.status(400).json({ 
        success: false, 
        message: '必须确认所有警戒条件：警示牌、通风设施、撤离路线、应急设备' 
      });
    }

    const plan = await FumigationPlan.findById(record.fumigationPlanId);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    const validation = await BusinessRuleService.validateStatusTransition(
      plan.status,
      'guard_confirmed',
      plan._id.toString()
    );

    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    record.guardConfirmedAt = new Date();
    await record.save();

    plan.status = 'guard_confirmed';
    plan.statusHistory.push({
      status: 'guard_confirmed',
      operator: record.safetyOfficer,
      operatorName: record.safetyOfficerName,
      timestamp: new Date(),
      remark: '安环员确认警戒和通风条件'
    });
    await plan.save();

    res.json({ success: true, data: record, message: '警戒条件确认成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '确认失败', error: (error as Error).message });
  }
});

router.post('/:id/release', async (req: Request, res: Response) => {
  try {
    const record = await GuardRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '警戒记录不存在' });
    }

    if (record.isGuardReleased) {
      return res.status(400).json({ success: false, message: '警戒已解除' });
    }

    const { operator, operatorName, releaseRemark } = req.body;

    const validation = await BusinessRuleService.canReleaseGuard(record.fumigationPlanId);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    record.isGuardReleased = true;
    record.guardReleasedAt = new Date();
    record.guardReleasedBy = operator;
    record.guardReleasedByName = operatorName;
    record.releaseRemark = releaseRemark || '';
    await record.save();

    const plan = await FumigationPlan.findById(record.fumigationPlanId);
    if (plan) {
      plan.status = 'guard_released';
      plan.statusHistory.push({
        status: 'guard_released',
        operator,
        operatorName,
        timestamp: new Date(),
        remark: releaseRemark || '解除警戒'
      });
      await plan.save();
    }

    res.json({ success: true, data: record, message: '警戒解除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '解除失败', error: (error as Error).message });
  }
});

export default router;
