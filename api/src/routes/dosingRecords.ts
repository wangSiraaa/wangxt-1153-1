import { Router, Request, Response } from 'express';
import DosingRecord from '../models/DosingRecord';
import FumigationPlan from '../models/FumigationPlan';
import { BusinessRuleService } from '../services/BusinessRuleService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { fumigationPlanId } = req.query;
    const query: any = {};
    if (fumigationPlanId) query.fumigationPlanId = fumigationPlanId;
    
    const records = await DosingRecord.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { fumigationPlanId } = req.body;
    
    const existing = await DosingRecord.findOne({ fumigationPlanId });
    if (existing) {
      return res.status(400).json({ success: false, message: '该熏蒸计划已存在投药记录' });
    }

    const plan = await FumigationPlan.findById(fumigationPlanId);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    if (plan.status !== 'guard_confirmed' && plan.status !== 'dosing_pending') {
      return res.status(400).json({ success: false, message: `当前状态[${plan.status}]不允许创建投药记录` });
    }

    const record = new DosingRecord(req.body);
    await record.save();

    plan.dosingRecordId = record._id.toString();
    plan.constructionLeader = record.constructionLeader;
    plan.constructionLeaderName = record.constructionLeaderName;
    plan.status = 'dosing_pending';
    plan.statusHistory.push({
      status: 'dosing_pending',
      operator: record.constructionLeader,
      operatorName: record.constructionLeaderName,
      timestamp: new Date(),
      remark: '进入投药准备阶段'
    });
    await plan.save();

    res.json({ success: true, data: record, message: '投药记录创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    if (record.dosingEndTime) {
      return res.status(400).json({ success: false, message: '已完成的投药记录不能修改' });
    }

    Object.assign(record, req.body);
    await record.save();

    res.json({ success: true, data: record, message: '投药记录更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/confirm-evacuation', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    if (record.evacuationCompleted) {
      return res.status(400).json({ success: false, message: '人员撤离已确认' });
    }

    const { operator, operatorName } = req.body;

    if (record.personnelList.length === 0) {
      return res.status(400).json({ success: false, message: '请先登记作业人员名单' });
    }

    if (record.evacuationCheck.length === 0) {
      return res.status(400).json({ success: false, message: '请先完成撤离区域检查' });
    }

    const allChecked = record.evacuationCheck.every(check => check.checked);
    if (!allChecked) {
      return res.status(400).json({ success: false, message: '存在未检查的区域' });
    }

    record.evacuationCompleted = true;
    record.allPersonnelEvacuated = true;
    record.evacuationCompletedAt = new Date();
    record.evacuationConfirmedBy = operator;
    record.evacuationConfirmedByName = operatorName;
    await record.save();

    const plan = await FumigationPlan.findById(record.fumigationPlanId);
    if (plan) {
      plan.status = 'evacuation_pending';
      plan.statusHistory.push({
        status: 'evacuation_pending',
        operator,
        operatorName,
        timestamp: new Date(),
        remark: '确认所有人员已撤离'
      });
      await plan.save();
    }

    res.json({ success: true, data: record, message: '人员撤离确认成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '确认失败', error: (error as Error).message });
  }
});

router.post('/:id/start-dosing', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    if (record.dosingStartTime) {
      return res.status(400).json({ success: false, message: '投药已开始' });
    }

    const validation = await BusinessRuleService.canStartDosing(record.fumigationPlanId);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    record.dosingStartTime = new Date();
    await record.save();

    res.json({ success: true, data: record, message: '投药已开始' });
  } catch (error) {
    res.status(500).json({ success: false, message: '开始投药失败', error: (error as Error).message });
  }
});

router.post('/:id/complete-dosing', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    if (record.dosingEndTime) {
      return res.status(400).json({ success: false, message: '投药已完成' });
    }

    if (!record.dosingStartTime) {
      return res.status(400).json({ success: false, message: '投药尚未开始' });
    }

    const { operator, operatorName } = req.body;

    record.dosingEndTime = new Date();
    record.dosingOperator = operator;
    record.dosingOperatorName = operatorName;
    await record.save();

    const plan = await FumigationPlan.findById(record.fumigationPlanId);
    if (plan) {
      plan.status = 'dosing_completed';
      plan.statusHistory.push({
        status: 'dosing_completed',
        operator,
        operatorName,
        timestamp: new Date(),
        remark: '完成投药作业'
      });
      await plan.save();
    }

    res.json({ success: true, data: record, message: '投药完成' });
  } catch (error) {
    res.status(500).json({ success: false, message: '完成投药失败', error: (error as Error).message });
  }
});

router.post('/:id/add-evacuation-check', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    const { area, checked, checker, checkTime } = req.body;
    
    const existingIndex = record.evacuationCheck.findIndex(c => c.area === area);
    if (existingIndex >= 0) {
      record.evacuationCheck[existingIndex].checked = checked !== undefined ? checked : record.evacuationCheck[existingIndex].checked;
      record.evacuationCheck[existingIndex].checker = checker || record.evacuationCheck[existingIndex].checker;
      record.evacuationCheck[existingIndex].checkTime = checkTime || new Date();
    } else {
      record.evacuationCheck.push({ 
        area, 
        checked: checked !== undefined ? checked : false, 
        checker: checker || '', 
        checkTime: checkTime || new Date() 
      });
    }
    
    await record.save();

    res.json({ success: true, data: record, message: '更新撤离检查记录成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/add-personnel', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    const { name, role, idCard, contact } = req.body;
    record.personnelList.push({ name, role, idCard, contact });
    await record.save();

    res.json({ success: true, data: record, message: '添加作业人员成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加失败', error: (error as Error).message });
  }
});

export default router;
