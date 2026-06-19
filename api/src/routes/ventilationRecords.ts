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
      return res.status(404).json({ success: false, message: '通风记录不存在' });
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

    const record = new VentilationRecord(data);
    await record.save();

    res.json({ success: true, data: record, message: '通风记录创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建失败', error: (error as Error).message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风记录不存在' });
    }

    Object.assign(record, req.body);
    await record.save();

    res.json({ success: true, data: record, message: '通风记录更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风记录不存在' });
    }

    const { operator, operatorName } = req.body;

    record.ventilationStartTime = new Date();
    record.ventilationOperator = operator;
    record.ventilationOperatorName = operatorName;
    record.ventilationStatus = 'ventilating';

    await record.save();

    res.json({ success: true, data: record, message: '通风已开始' });
  } catch (error) {
    res.status(500).json({ success: false, message: '通风开始失败', error: (error as Error).message });
  }
});

router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风记录不存在' });
    }

    const { operator, operatorName, remark } = req.body;

    if (record.ventilationStatus !== 'ventilating') {
      return res.status(400).json({ success: false, message: '当前状态不允许停止通风' });
    }

    record.ventilationEndTime = new Date();
    record.ventilationStatus = 'completed';
    if (record.ventilationStartTime) {
      const durationMs = record.ventilationEndTime.getTime() - record.ventilationStartTime.getTime();
      record.ventilationDuration = Math.round(durationMs / 60000);
    }
    if (remark) {
      record.remark = remark;
    }

    await record.save();

    res.json({ success: true, data: record, message: '通风已停止' });
  } catch (error) {
    res.status(500).json({ success: false, message: '通风停止失败', error: (error as Error).message });
  }
});

router.post('/:id/add-detection', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风记录不存在' });
    }

    const { detectionTime, detector, detectorName, gasConcentration, detectionLocation, isQualified, remark } = req.body;

    record.detectionRecords.push({
      detectionTime: detectionTime || new Date(),
      detector,
      detectorName,
      gasConcentration,
      detectionLocation,
      isQualified: isQualified || false,
      remark: remark || ''
    });

    if (isQualified) {
      record.finalConcentration = gasConcentration;
      record.isQualified = true;
      record.qualifiedAt = new Date();
      record.qualifiedBy = detector;
      record.qualifiedByName = detectorName;
    }

    await record.save();

    res.json({ success: true, data: record, message: '检测记录添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加失败', error: (error as Error).message });
  }
});

router.post('/:id/add-recheck', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风记录不存在' });
    }

    const { rechecker, recheckerName, gasConcentration, recheckLocation, isQualified, remark } = req.body;

    record.recheckRecords.push({
      recheckTime: new Date(),
      rechecker,
      recheckerName,
      gasConcentration,
      recheckLocation,
      isQualified: isQualified || false,
      isRecheck: true,
      remark: remark || ''
    });

    record.recheckCount = record.recheckRecords.length;

    await record.save();

    res.json({ success: true, data: record, message: '通风复检记录添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加失败', error: (error as Error).message });
  }
});

router.post('/:id/confirm-final-recheck', async (req: Request, res: Response) => {
  try {
    const record = await VentilationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '通风记录不存在' });
    }

    const { operator, operatorName, finalConcentration } = req.body;

    if (record.recheckCount === 0 || record.recheckRecords.length === 0) {
      return res.status(400).json({ success: false, message: '暂无通风复检记录，无法确认最终结果' });
    }

    const lastRecheck = record.recheckRecords[record.recheckRecords.length - 1];
    if (!lastRecheck.isQualified) {
      return res.status(400).json({ 
        success: false, 
        message: `最近一次复检未达标(浓度: ${lastRecheck.gasConcentration}ppm)，不能确认复检通过` 
      });
    }

    record.finalRecheckPassed = true;
    record.isQualified = true;
    record.finalConcentration = finalConcentration !== undefined ? finalConcentration : lastRecheck.gasConcentration;
    record.qualifiedAt = new Date();
    record.qualifiedBy = operator;
    record.qualifiedByName = operatorName;

    await record.save();

    res.json({ success: true, data: record, message: '通风复检已确认通过，可以解除警戒' });
  } catch (error) {
    res.status(500).json({ success: false, message: '确认失败', error: (error as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await VentilationRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '通风记录删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败', error: (error as Error).message });
  }
});

export default router;
