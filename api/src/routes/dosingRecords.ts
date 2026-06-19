import { Router, Request, Response } from 'express';
import DosingRecord from '../models/DosingRecord';
import FumigationPlan from '../models/FumigationPlan';
import GuardRecord from '../models/GuardRecord';
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
    const data = req.body;
    const plan = await FumigationPlan.findById(data.fumigationPlanId);
    
    if (!plan) {
      return res.status(404).json({ success: false, message: '熏蒸计划不存在' });
    }

    const createValidation = await BusinessRuleService.canCreateDosingRecord(
      data.fumigationPlanId,
      data.constructionLeader,
      data.constructionLeaderName
    );

    if (!createValidation.valid) {
      return res.status(400).json({ success: false, message: createValidation.message });
    }

    const guardRecord = await GuardRecord.findOne({ fumigationPlanId: data.fumigationPlanId });
    if (guardRecord && guardRecord.isGuardConfirmed) {
      data.guardConfirmed = true;
      data.guardConfirmedAt = guardRecord.guardConfirmedAt;
      data.guardConfirmedBy = guardRecord.guardConfirmedBy;
      data.guardConfirmedByName = guardRecord.guardConfirmedByName;
      data.guardRecordId = guardRecord._id.toString();
    }

    const record = new DosingRecord(data);
    await record.save();

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

    Object.assign(record, req.body);
    await record.save();

    res.json({ success: true, data: record, message: '投药记录更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败', error: (error as Error).message });
  }
});

router.post('/:id/confirm-evacuation/:personIndex', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    const { confirmedBy, confirmedByName } = req.body;
    const personIndex = parseInt(req.params.personIndex);

    if (personIndex < 0 || personIndex >= record.evacuationList.length) {
      return res.status(400).json({ success: false, message: '人员索引无效' });
    }

    record.evacuationList[personIndex].confirmed = true;
    record.evacuationList[personIndex].confirmedBy = confirmedBy;
    record.evacuationList[personIndex].confirmedAt = new Date();

    await record.save();

    res.json({ success: true, data: record, message: '人员撤离确认成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '确认失败', error: (error as Error).message });
  }
});

router.post('/:id/confirm-all-evacuation', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    const { confirmedBy, confirmedByName, evacuationCheck, remark } = req.body;
    const confirmedAt = new Date();

    record.evacuationList = record.evacuationList.map(person => {
      if (!person.confirmed) {
        person.confirmed = true;
        person.confirmedBy = confirmedBy;
        person.confirmedAt = confirmedAt;
      }
      return person;
    });

    record.allPersonnelEvacuated = true;
    record.evacuationCompleted = true;
    record.evacuationCompletedAt = confirmedAt;
    record.evacuationConfirmedBy = confirmedBy;
    record.evacuationConfirmedByName = confirmedByName;
    if (evacuationCheck) {
      record.evacuationCheck = evacuationCheck;
    }
    if (remark) {
      record.remark = remark;
    }

    await record.save();

    res.json({ success: true, data: record, message: '全员撤离确认成功' });
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

    const { operator, operatorName } = req.body;

    const validation = await BusinessRuleService.canStartDosing(
      record.fumigationPlanId.toString(),
      record._id.toString(),
      operator
    );

    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    if (record.actualDosage === undefined || record.actualDosage <= 0) {
      return res.status(400).json({ success: false, message: '请先设置实际投药量，且投药量必须大于0' });
    }

    record.dosingStartTime = new Date();
    record.dosingOperator = operator;
    record.dosingOperatorName = operatorName;
    record.dosingStatus = 'in_progress';

    await record.save();

    res.json({ success: true, data: record, message: '投药已开始' });
  } catch (error) {
    res.status(500).json({ success: false, message: '投药开始失败', error: (error as Error).message });
  }
});

router.post('/:id/complete-dosing', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    const { operator, operatorName, remark } = req.body;

    if (record.dosingStatus !== 'in_progress') {
      return res.status(400).json({ success: false, message: '当前状态不允许完成投药' });
    }

    record.dosingEndTime = new Date();
    record.dosingStatus = 'completed';
    if (remark) {
      record.remark = remark;
    }

    await record.save();

    res.json({ success: true, data: record, message: '投药已完成' });
  } catch (error) {
    res.status(500).json({ success: false, message: '投药完成失败', error: (error as Error).message });
  }
});

router.post('/:id/sync-guard', async (req: Request, res: Response) => {
  try {
    const record = await DosingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: '投药记录不存在' });
    }

    const guardRecord = await GuardRecord.findOne({ fumigationPlanId: record.fumigationPlanId });
    if (!guardRecord || !guardRecord.isGuardConfirmed) {
      return res.status(400).json({ success: false, message: '警戒尚未确认，无法同步' });
    }

    record.guardConfirmed = true;
    record.guardConfirmedAt = guardRecord.guardConfirmedAt;
    record.guardConfirmedBy = guardRecord.guardConfirmedBy;
    record.guardConfirmedByName = guardRecord.guardConfirmedByName;
    record.guardRecordId = guardRecord._id.toString();

    await record.save();

    res.json({ success: true, data: record, message: '警戒确认状态已同步' });
  } catch (error) {
    res.status(500).json({ success: false, message: '同步失败', error: (error as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await DosingRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '投药记录删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败', error: (error as Error).message });
  }
});

export default router;
