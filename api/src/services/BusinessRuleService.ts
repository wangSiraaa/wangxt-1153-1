import DosingRecord from '../models/DosingRecord';
import VentilationRecord from '../models/VentilationRecord';
import FumigationPlan, { FumigationStatus } from '../models/FumigationPlan';
import Chemical from '../models/Chemical';

export interface ValidationResult {
  valid: boolean;
  message: string;
}

export class BusinessRuleService {
  
  static async canStartDosing(fumigationPlanId: string): Promise<ValidationResult> {
    const dosingRecord = await DosingRecord.findOne({ fumigationPlanId });
    if (!dosingRecord) {
      return { valid: false, message: '投药记录不存在' };
    }

    if (!dosingRecord.evacuationCompleted) {
      return { valid: false, message: '人员未完成撤离，不能开始投药' };
    }

    if (!dosingRecord.allPersonnelEvacuated) {
      return { valid: false, message: '未确认所有人员已撤离，不能开始投药' };
    }

    if (dosingRecord.evacuationCheck.length === 0) {
      return { valid: false, message: '未完成撤离区域检查，不能开始投药' };
    }

    const allChecked = dosingRecord.evacuationCheck.every(check => check.checked);
    if (!allChecked) {
      return { valid: false, message: '存在未检查的区域，不能开始投药' };
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

    if (ventilationRecord.detectionRecords.length === 0) {
      return { valid: false, message: '未进行气体浓度检测，不能解除警戒' };
    }

    const lastDetection = ventilationRecord.detectionRecords[ventilationRecord.detectionRecords.length - 1];
    if (!lastDetection.isQualified) {
      return { valid: false, message: '最近一次检测未达标，不能解除警戒' };
    }

    const chemical = await Chemical.findOne({ name: ventilationRecord.planNo.includes('PH3') ? '磷化铝' : { $exists: true } });
    if (chemical && lastDetection.gasConcentration > chemical.safeExposureLimit) {
      return { 
        valid: false, 
        message: `气体浓度${lastDetection.gasConcentration}mg/m³超过安全限值${chemical.safeExposureLimit}mg/m³，不能解除警戒` 
      };
    }

    const plan = await FumigationPlan.findById(fumigationPlanId);
    if (!plan) {
      return { valid: false, message: '熏蒸计划不存在' };
    }

    if (plan.status !== 'detection_passed' && plan.status !== 'detection_pending') {
      return { valid: false, message: `当前状态[${plan.status}]不允许解除警戒` };
    }

    return { valid: true, message: '可以解除警戒' };
  }

  static async validateStatusTransition(
    currentStatus: FumigationStatus,
    targetStatus: FumigationStatus,
    fumigationPlanId: string
  ): Promise<ValidationResult> {
    
    const validTransitions: Record<FumigationStatus, FumigationStatus[]> = {
      'draft': ['submitted', 'cancelled'],
      'submitted': ['guard_pending', 'cancelled'],
      'guard_pending': ['guard_confirmed', 'cancelled'],
      'guard_confirmed': ['dosing_pending', 'cancelled'],
      'dosing_pending': ['evacuation_pending', 'cancelled'],
      'evacuation_pending': ['dosing_completed', 'cancelled'],
      'dosing_completed': ['fumigating', 'cancelled'],
      'fumigating': ['ventilation_pending', 'cancelled'],
      'ventilation_pending': ['ventilating', 'cancelled'],
      'ventilating': ['detection_pending', 'cancelled'],
      'detection_pending': ['detection_passed', 'ventilating', 'cancelled'],
      'detection_passed': ['guard_released', 'cancelled'],
      'guard_released': ['completed'],
      'completed': [],
      'cancelled': []
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(targetStatus)) {
      return { 
        valid: false, 
        message: `不允许从状态[${currentStatus}]转换到[${targetStatus}]` 
      };
    }

    if (targetStatus === 'dosing_completed') {
      return this.canStartDosing(fumigationPlanId);
    }

    if (targetStatus === 'guard_released') {
      return this.canReleaseGuard(fumigationPlanId);
    }

    return { valid: true, message: '状态转换有效' };
  }
}
