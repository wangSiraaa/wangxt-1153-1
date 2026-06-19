import Warehouse from '../models/Warehouse';
import FumigationPlan from '../models/FumigationPlan';
import StockInOrder from '../models/StockInOrder';

export interface DoorAccessResult {
  allowed: boolean;
  reason: string;
  fumigationPlanId?: string;
  planNo?: string;
  fumigationStatus?: string;
}

const ACTIVE_FUMIGATION_STATUSES = [
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

export class DoorControlService {

  static async checkWarehouseDoorAccess(warehouseId: string): Promise<DoorAccessResult> {
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return { allowed: false, reason: '仓房不存在' };
    }

    if (warehouse.status === 'maintenance') {
      return { allowed: false, reason: '仓房正在维护中，禁止出入' };
    }

    if (warehouse.status === 'locked') {
      return { allowed: false, reason: '仓房已被锁定，禁止出入' };
    }

    const activePlan = await FumigationPlan.findOne({
      warehouseId,
      status: { $in: ACTIVE_FUMIGATION_STATUSES }
    }).sort({ createdAt: -1 });

    if (activePlan) {
      const statusMessages: Record<string, string> = {
        'submitted': '熏蒸计划已提交待审核',
        'safety_review_pending': '待安环员复核中',
        'safety_reviewed': '已通过安环员复核',
        'guard_pending': '警戒设置中',
        'guard_confirmed': '警戒已确认',
        'dosing_pending': '投药准备中',
        'evacuation_pending': '人员撤离中',
        'dosing_completed': '投药完成',
        'fumigating': '熏蒸密闭中',
        'ventilation_pending': '通风准备中',
        'ventilating': '通风散气中',
        'recheck_pending': '通风复检中',
        'detection_pending': '气体检测中',
        'detection_passed': '检测达标待解除警戒',
      };

      const statusDesc = statusMessages[activePlan.status] || '熏蒸作业进行中';

      return {
        allowed: false,
        reason: `仓房${statusDesc}[计划号: ${activePlan.planNo}]，熏蒸期间普通入库单禁止打开仓门`,
        fumigationPlanId: activePlan._id.toString(),
        planNo: activePlan.planNo,
        fumigationStatus: activePlan.status,
      };
    }

    return { allowed: true, reason: '仓门可以正常开启' };
  }

  static async checkStockInOrderDoorAccess(
    warehouseId: string,
    stockInOrderId: string,
    operator: string,
    operatorName: string
  ): Promise<DoorAccessResult> {
    const accessResult = await this.checkWarehouseDoorAccess(warehouseId);

    const stockInOrder = await StockInOrder.findById(stockInOrderId);
    if (stockInOrder) {
      stockInOrder.doorAccessAttempted = true;
      stockInOrder.doorAccessDenied = !accessResult.allowed;
      stockInOrder.doorAccessDeniedReason = accessResult.allowed ? '' : accessResult.reason;
      stockInOrder.fumigationCheckPassed = accessResult.allowed;

      if (!accessResult.allowed) {
        stockInOrder.blockedByFumigation = true;
        stockInOrder.blockedFumigationPlanId = accessResult.fumigationPlanId || null;
        stockInOrder.blockedFumigationPlanNo = accessResult.planNo || null;
        stockInOrder.blockedFumigationStatus = accessResult.fumigationStatus || null;
        stockInOrder.blockedAt = new Date();
        stockInOrder.fumigationBlockRemark = accessResult.reason;
        if (stockInOrder.status !== 'blocked') {
          stockInOrder.status = 'blocked';
        }
      }

      await stockInOrder.save();
    }

    return accessResult;
  }

  static async lockWarehouseForFumigation(
    warehouseId: string,
    fumigationPlanId: string
  ): Promise<{ success: boolean; message: string }> {
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return { success: false, message: '仓房不存在' };
    }

    if (warehouse.status === 'fumigating') {
      return { success: false, message: '仓房已处于熏蒸状态' };
    }

    if (warehouse.status === 'maintenance') {
      return { success: false, message: '仓房正在维护中，无法进行熏蒸' };
    }

    if (warehouse.status === 'locked') {
      return { success: false, message: '仓房已被锁定' };
    }

    warehouse.status = 'fumigating';
    warehouse.currentFumigationPlanId = fumigationPlanId;
    await warehouse.save();

    return { success: true, message: '仓房已成功锁定，禁止普通入库操作' };
  }

  static async unlockWarehouseAfterFumigation(
    warehouseId: string,
    fumigationPlanId: string
  ): Promise<{ success: boolean; message: string }> {
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return { success: false, message: '仓房不存在' };
    }

    if (warehouse.currentFumigationPlanId !== fumigationPlanId) {
      return { success: false, message: '当前熏蒸计划与仓房锁定的计划不匹配' };
    }

    warehouse.status = 'normal';
    warehouse.currentFumigationPlanId = undefined;
    await warehouse.save();

    const blockedOrders = await StockInOrder.find({
      warehouseId,
      status: 'blocked',
      blockedFumigationPlanId: fumigationPlanId
    });

    for (const order of blockedOrders) {
      order.status = 'draft';
      order.blockedByFumigation = false;
      await order.save();
    }

    return { success: true, message: '仓房已成功解锁，恢复正常使用' };
  }

  static async getFumigatingWarehouses(): Promise<Array<{
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    planNo: string;
    status: string;
    startTime: Date;
    warningScope: string;
    grainType: string;
    chemicalName: string;
  }>> {
    const plans = await FumigationPlan.find({
      status: { $in: ACTIVE_FUMIGATION_STATUSES }
    }).sort({ createdAt: -1 });

    return plans.map(plan => ({
      warehouseId: plan.warehouseId,
      warehouseCode: plan.warehouseCode,
      warehouseName: plan.warehouseName,
      planNo: plan.planNo,
      status: plan.status,
      startTime: plan.actualStartDate || plan.createdAt,
      warningScope: plan.warningScope || '',
      grainType: plan.grainType || '',
      chemicalName: plan.chemicalName || '',
    }));
  }
}
