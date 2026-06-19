import DosingRecord from '../models/DosingRecord';
import VentilationRecord from '../models/VentilationRecord';
import FumigationPlan, { FumigationStatus, IFumigationPlan } from '../models/FumigationPlan';
import Chemical from '../models/Chemical';
import GuardRecord from '../models/GuardRecord';

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export class BusinessRuleService {

  static async canSubmitPlan(planId: string): Promise<ValidationResult> {
    const plan = await FumigationPlan.findById(planId);
    if (!plan) {
      return { valid: false, message: '熏蒸计划不存在' };
    }

    if (!plan.warehouseId || !plan.warehouseCode || !plan.warehouseName) {
      return { valid: false, message: '请完整填写仓房信息（仓房ID、编号、名称）' };
    }

    if (!plan.grainType || plan.grainType.trim() === '') {
      return { valid: false, message: '粮种不能为空，请填写熏蒸粮种' };
    }

    if (!plan.chemicalId || !plan.chemicalName) {
      return { valid: false, message: '请完整填写药剂信息（药剂ID、名称）' };
    }

    if (!plan.chemicalDosage || plan.chemicalDosage <= 0) {
      return { valid: false, message: '药剂使用量必须大于0' };
    }

    if (!plan.warningScope || plan.warningScope.trim() === '') {
      return { valid: false, message: '警戒范围不能为空，请填写警戒范围描述' };
    }

    if (!plan.plannedStartDate || !plan.plannedEndDate) {
      return { valid: false, message: '请填写计划开始和结束时间' };
    }

    return { valid: true, message: '计划信息完整，可以提交' };
  }

  static async canCreateDosingRecord(
    fumigationPlanId: string, 
    constructionLeader?: string, 
    constructionLeaderName?: string
  ): Promise<ValidationResult> {
    const plan = await FumigationPlan.findById(fumigationPlanId);
    if (!plan) {
      return { valid: false, message: '熏蒸计划不存在' };
    }

    if (plan.status !== 'guard_confirmed' && plan.status !== 'safety_reviewed') {
      return { valid: false, message: `当前状态[${plan.status}]不允许登记投药，需先完成警戒确认和安环员复核` };
    }

    const guardRecord = await GuardRecord.findOne({ fumigationPlanId });
    if (!guardRecord) {
      return { valid: false, message: '警戒记录不存在，请先完成警戒设置' };
    }

    if (!guardRecord.guardConfirmedAt) {
      return { valid: false, message: '警戒未确认，请先由安环员确认警戒条件' };
    }

    if (!guardRecord.warningSigns || !guardRecord.ventilationFacility || 
        !guardRecord.evacuationRoute || !guardRecord.emergencyEquipment) {
      return { valid: false, message: '警戒条件不完整：警示牌、通风设施、撤离路线、应急设备必须全部确认' };
    }

    const existingDosing = await DosingRecord.findOne({ fumigationPlanId });
    if (existingDosing) {
      return { valid: false, message: '该熏蒸计划已存在投药记录' };
    }

    return { valid: true, message: '可以登记投药' };
  }

  static async canStartDosing(
    fumigationPlanId: string, 
    dosingRecordId?: string, 
    operator?: string
  ): Promise<ValidationResult> {
    const dosingRecord = await DosingRecord.findOne({ fumigationPlanId });
    if (!dosingRecord) {
      return { valid: false, message: '投药记录不存在' };
    }

    if (!dosingRecord.guardConfirmed) {
      return { valid: false, message: '警戒未确认，施工负责人不能登记投药' };
    }

    if (!dosingRecord.evacuationCompleted) {
      return { valid: false, message: '人员未完成撤离，不能开始投药' };
    }

    if (!dosingRecord.allPersonnelEvacuated) {
      return { valid: false, message: '未确认所有人员已撤离，不能开始投药' };
    }

    if (dosingRecord.evacuationList && dosingRecord.evacuationList.length > 0) {
      const allEvacuatedConfirmed = dosingRecord.evacuationList.every(p => p.confirmed);
      if (!allEvacuatedConfirmed) {
        return { valid: false, message: '存在未确认撤离的人员，请核实所有人员撤离情况' };
      }
    }

    if (dosingRecord.evacuationCheck.length === 0) {
      return { valid: false, message: '未完成撤离区域检查，不能开始投药' };
    }

    const allChecked = dosingRecord.evacuationCheck.every(check => check.checked);
    if (!allChecked) {
      return { valid: false, message: '存在未检查的区域，不能开始投药' };
    }

    if (!dosingRecord.actualDosage || dosingRecord.actualDosage <= 0) {
      return { valid: false, message: '实际投药量未填写，不能开始投药' };
    }

    const plan = await FumigationPlan.findById(fumigationPlanId);
    if (!plan) {
      return { valid: false, message: '熏蒸计划不存在' };
    }

    if (plan.status !== 'evacuation_pending' && plan.status !== 'dosing_pending') {
      return { valid: false, message: `当前状态[${plan.status}]不允许投药` };
    }

    return { valid: true, message: '可以开始投药' };
  }

  static async canReleaseGuard(fumigationPlanId: string): Promise<ValidationResult> {
    const ventilationRecord = await VentilationRecord.findOne({ fumigationPlanId });
    if (!ventilationRecord) {
      return { valid: false, message: '通风检测记录不存在' };
    }

    if (!ventilationRecord.isQualified) {
      return { valid: false, message: '通风检测未达标，不能解除警戒' };
    }

    if (ventilationRecord.recheckCount > 0) {
      if (!ventilationRecord.finalRecheckPassed) {
        return { valid: false, message: '通风复检未最终通过，不能解除警戒' };
      }
      if (ventilationRecord.recheckRecords.length === 0) {
        return { valid: false, message: '未进行通风复检，不能解除警戒' };
      }
      const lastRecheck = ventilationRecord.recheckRecords[ventilationRecord.recheckRecords.length - 1];
      if (!lastRecheck.isQualified) {
        return { valid: false, message: '最近一次复检未达标，不能解除警戒' };
      }
    }

    if (ventilationRecord.detectionRecords.length === 0) {
      return { valid: false, message: '未进行气体浓度检测，不能解除警戒' };
    }

    const lastDetection = ventilationRecord.detectionRecords[ventilationRecord.detectionRecords.length - 1];
    if (!lastDetection.isQualified) {
      return { valid: false, message: '最近一次检测未达标，不能解除警戒' };
    }

    const plan = await FumigationPlan.findById(fumigationPlanId);
    if (!plan) {
      return { valid: false, message: '熏蒸计划不存在' };
    }

    if (plan.chemicalId) {
      const chemical = await Chemical.findById(plan.chemicalId);
      if (chemical && lastDetection.gasConcentration > chemical.safeExposureLimit) {
        return { 
          valid: false, 
          message: `气体浓度${lastDetection.gasConcentration}mg/m³超过安全限值${chemical.safeExposureLimit}mg/m³，不能解除警戒` 
        };
      }
    }

    if (plan.status !== 'detection_passed' && plan.status !== 'detection_pending' && plan.status !== 'recheck_pending') {
      return { valid: false, message: `当前状态[${plan.status}]不允许解除警戒` };
    }

    return { valid: true, message: '可以解除警戒' };
  }

  static async canCompleteSafetyReview(fumigationPlanId: string): Promise<ValidationResult> {
    const plan = await FumigationPlan.findById(fumigationPlanId);
    if (!plan) {
      return { valid: false, message: '熏蒸计划不存在' };
    }

    if (plan.status !== 'submitted' && plan.status !== 'safety_review_pending') {
      return { valid: false, message: `当前状态[${plan.status}]不允许安环员复核` };
    }

    if (plan.safetyReviewStatus === 'reviewed') {
      return { valid: false, message: '该计划已完成安环员复核' };
    }

    return { valid: true, message: '可以进行安环员复核' };
  }

  static canConfirmGuardCondition(guardRecord: any): ValidationResult {
    if (!guardRecord) {
      return { valid: false, message: '警戒记录不存在' };
    }

    const missingItems: string[] = [];
    if (!guardRecord.warningSigns) missingItems.push('警示牌');
    if (!guardRecord.ventilationFacility) missingItems.push('通风设施');
    if (!guardRecord.evacuationRoute) missingItems.push('撤离路线');
    if (!guardRecord.emergencyEquipment) missingItems.push('应急设备');

    if (missingItems.length > 0) {
      return { valid: false, message: `警戒条件不完整，请确认: ${missingItems.join('、')}` };
    }

    return { valid: true, message: '警戒条件确认完整' };
  }

  static async validateStatusTransition(
    currentStatus: FumigationStatus,
    targetStatus: FumigationStatus,
    fumigationPlanId: string
  ): Promise<ValidationResult> {
    
    const validTransitions: Record<FumigationStatus, FumigationStatus[]> = {
      'draft': ['submitted', 'cancelled'],
      'submitted': ['safety_review_pending', 'cancelled'],
      'safety_review_pending': ['safety_reviewed', 'cancelled'],
      'safety_reviewed': ['guard_pending', 'cancelled'],
      'guard_pending': ['guard_confirmed', 'cancelled'],
      'guard_confirmed': ['dosing_pending', 'cancelled'],
      'dosing_pending': ['evacuation_pending', 'cancelled'],
      'evacuation_pending': ['dosing_completed', 'cancelled'],
      'dosing_completed': ['fumigating', 'cancelled'],
      'fumigating': ['ventilation_pending', 'cancelled'],
      'ventilation_pending': ['ventilating', 'cancelled'],
      'ventilating': ['detection_pending', 'cancelled'],
      'detection_pending': ['detection_passed', 'ventilating', 'recheck_pending', 'cancelled'],
      'recheck_pending': ['detection_passed', 'ventilating', 'cancelled'],
      'detection_passed': ['guard_released', 'cancelled'],
      'guard_released': ['completed'],
      'completed': [],
      'cancelled': []
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions) {
      return { valid: false, message: `未知当前状态[${currentStatus}]` };
    }
    if (!allowedTransitions.includes(targetStatus)) {
      return { 
        valid: false, 
        message: `不允许从状态[${currentStatus}]转换到[${targetStatus}]` 
      };
    }

    if (targetStatus === 'submitted') {
      return this.canSubmitPlan(fumigationPlanId);
    }

    if (targetStatus === 'dosing_completed') {
      return this.canStartDosing(fumigationPlanId);
    }

    if (targetStatus === 'guard_released') {
      return this.canReleaseGuard(fumigationPlanId);
    }

    if (targetStatus === 'safety_reviewed') {
      return this.canCompleteSafetyReview(fumigationPlanId);
    }

    return { valid: true, message: '状态转换有效' };
  }
}
