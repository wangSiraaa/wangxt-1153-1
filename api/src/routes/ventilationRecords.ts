import { Router, Request, Response } from 'express';
import VentilationRecord from '../models/VentilationRecord';
import FumigationPlan from '../models/FumigationPlan';
import { BusinessRuleService } from '../services/BusinessRuleService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { fumigationPlanId } = req.query;
    const query: any = {};
    if (fumigationPlanId) query.fumigationPlanId = fumigationPlanId;
    
    const records = await VentilationRecord.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风检测记录不存在' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: '查询失败', error: (error as Error).message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { fumigationPlanId } = req.body;
    
    const existing = await VentilationRecord.findOne({ fumigationPlanId });
    if (existing) {
      return res.status(400).json({ success: false, message: '该熏蒸计划已存在通风检测记录' });
    }

    const plan = await FumigationPlan.findById(fumigationPlanId);
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    if (plan.status !== 'fumigating' && plan.status !== 'ventilation_pending') {
      return res.status(400).json({ success: false, message: `当前状态[${plan.status}]不允许创建通风检测记录` });
    }

    const record = new VentilationRecord(req.body);
    await record.save();

    plan.ventilationRecordId = record._id.toString();
    plan.status = 'ventilation_pending';
    plan.statusHistory.push({
      status: 'ventilation_pending',
      operator: record.ventilationOperator,
      operatorName: record.ventilationOperatorName,
      timestamp: new Date(),
      remark: '进入通风准备阶段'
    });
    await plan.save();

    res.json({ success: true, data: record, message: '通风检测记录创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风检测记录不存在' });
    }

    if (record.isQualified) {
      return res.status(400).json({ success: false, message: '已达标的通风记录不能修改' });
    }

    Object.assign(record, req.body);
    await record.save();

    res.json({ success: true, data: record, message: '通风检测记录更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/start-ventilation', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风检测记录不存在' });
    }

    if (record.ventilationStartTime) {
      return res.status(400).json({ success: false, message: '通风已开始' });
    }

    const { operator, operatorName } = req.body;

    record.ventilationStartTime = new Date();
    record.ventilationOperator = operator;
    record.ventilationOperatorName = operatorName;
    await record.save();

    const plan = await FumigationPlan.findById(record.fumigationPlanId);
    if (plan) {
      plan.status = 'ventilating';
      plan.statusHistory.push({
        status: 'ventilating',
        operator,
        operatorName,
        timestamp: new Date(),
        remark: '开始通风散气'
      });
      await plan.save();
    }

    res.json({ success: true, data: record, message: '通风已开始' });
  } catch (error) {
    res.status(500).json({ success: false, message: '开始通风失败', error: (error as Error).message });
  }
});

router.post('/:id/stop-ventilation', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风检测记录不存在' });
    }

    if (record.ventilationEndTime) {
      return res.status(400).json({ success: false, message: '通风已停止' });
    }

    if (!record.ventilationStartTime) {
      return res.status(400).json({ success: false, message: '通风尚未开始' });
    }

    record.ventilationEndTime = new Date();
    await record.save();

    const plan = await FumigationPlan.findById(record.fumigationPlanId);
    if (plan) {
      plan.status = 'detection_pending';
      plan.statusHistory.push({
        status: 'detection_pending',
        operator: record.ventilationOperator,
        operatorName: record.ventilationOperatorName,
        timestamp: new Date(),
        remark: '通风结束，进入气体检测阶段'
      });
      await plan.save();
    }

    res.json({ success: true, data: record, message: '通风已停止' });
  } catch (error) {
    res.status(500).json({ success: false, message: '停止通风失败', error: (error as Error).message });
  }
});

router.post('/:id/add-detection', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风检测记录不存在' });
    }

    const { 
      detectionTime, 
      detector, 
      detectorName, 
      gasConcentration, 
      detectionLocation, 
      isQualified, 
      remark,
      safeLimit 
    } = req.body;

    const qualified = isQualified !== undefined ? isQualified : gasConcentration <= (safeLimit || 0.3);

    record.detectionRecords.push({
      detectionTime: detectionTime || new Date(),
      detector,
      detectorName,
      gasConcentration,
      detectionLocation,
      isQualified: qualified,
      remark: remark || ''
    });

    record.finalConcentration = gasConcentration;
    record.isQualified = qualified;
    await record.save();

    if (qualified) {
      const plan = await FumigationPlan.findById(record.fumigationPlanId);
      if (plan && plan.status !== 'detection_passed') {
        plan.status = 'detection_passed';
        plan.statusHistory.push({
          status: 'detection_passed',
          operator: detector,
          operatorName: detectorName,
          timestamp: new Date(),
          remark: `气体检测达标，浓度${gasConcentration}mg/m³`
        });
        await plan.save();
      }
      record.qualifiedAt = new Date();
      record.qualifiedBy = detector;
      record.qualifiedByName = detectorName;
      await record.save();
    }

    res.json({ 
      success: true, 
      data: record, 
      message: qualified ? '检测结果达标' : '检测结果未达标，请继续通风' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加检测记录失败', error: (error as Error).message });
  }
});

router.post('/:id/confirm-qualified', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风检测记录不存在' });
    }

    if (record.isQualified) {
      return res.status(400).json({ success: false, message: '已确认达标' });
    }

    const { operator, operatorName } = req.body;

    if (record.detectionRecords.length === 0) {
      return res.status(400).json({ success: false, message: '未进行气体检测' });
    }

    const lastDetection = record.detectionRecords[record.detectionRecords.length - 1];
    if (!lastDetection.isQualified) {
      return res.status(400).json({ success: false, message: '最近一次检测未达标' });
    }

    const validation = await BusinessRuleService.canReleaseGuard(record.fumigationPlanId);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    record.isQualified = true;
    record.qualifiedAt = new Date();
    record.qualifiedBy = operator;
    record.qualifiedByName = operatorName;
    await record.save();

    const plan = await FumigationPlan.findById(record.fumigationPlanId);
    if (plan) {
      plan.status = 'detection_passed';
      plan.statusHistory.push({
        status: 'detection_passed',
        operator,
        operatorName,
        timestamp: new Date(),
        remark: '安环员确认气体检测达标'
      });
      await plan.save();
    }

    res.json({ success: true, data: record, message: '确认检测达标' });
  } catch (error) {
    res.status(500).json({ success: false, message: '确认失败', error: (error as Error).message });
  }
});

export default router;
