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
    const data = req.body;
    const plan = await FumigationPlan.findById(data.fumigationPlanId);
    
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    if (plan.status !== 'safety_reviewed' && plan.status !== 'guard_pending') {
      return res.status(400).json({ 
        success: false, 
        message: `当前计划状态为${plan.status}，不能创建警戒记录，请先通过安环员复核` 
      });
    }

    if (!data.warningScope && plan.warningScope) {
      data.warningScope = plan.warningScope;
    }
    if ((!data.warningScopeDetail || data.warningScopeDetail.length === 0) && plan.warningScopeDetail) {
      data.warningScopeDetail = plan.warningScopeDetail;
    }

    const record = new GuardRecord(data);
    await record.save();

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

    const { operator, operatorName, remark } = req.body;

    const { valid, message } = BusinessRuleService.canConfirmGuardCondition(record);
    if (!valid) {
      return res.status(400).json({ success: false, message });
    }

    record.isGuardConfirmed = true;
    record.guardConfirmedAt = new Date();
    record.guardConfirmedBy = operator;
    record.guardConfirmedByName = operatorName;
    if (remark) {
      record.remark = remark;
    }

    await record.save();

    res.json({ success: true, data: record, message: '警戒条件已确认' });
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

    const plan = await FumigationPlan.findById(record.fumigationPlanId);
    if (!plan) {
      return res.status(404).json({ success: false, message: '关联的熏蒸计划不存在' });
    }

    const { operator, operatorName, remark } = req.body;

    const releaseValidation = await BusinessRuleService.canReleaseGuard(plan._id.toString());
    if (!releaseValidation.valid) {
      return res.status(400).json({ success: false, message: releaseValidation.message });
    }

    if (!record.isGuardConfirmed) {
      return res.status(400).json({ success: false, message: '警戒尚未确认，无法解除' });
    }

    record.isGuardReleased = true;
    record.guardReleasedAt = new Date();
    record.guardReleasedBy = operator;
    record.guardReleasedByName = operatorName;
    if (remark) {
      record.remark = remark;
    }

    await record.save();

    res.json({ success: true, data: record, message: '警戒已解除' });
  } catch (error) {
    res.status(500).json({ success: false, message: '解除失败', error: (error as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await GuardRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '警戒记录删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败', error: (error as Error).message });
  }
});

export default router;
