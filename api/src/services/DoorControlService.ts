import Warehouse from '../models/Warehouse';
import FumigationPlan from '../models/FumigationPlan';
import StockInOrder from '../models/StockInOrder';

export interface DoorAccessResult {
  allowed: boolean;
  reason: string;
  fumigationPlanId?: string;
  planNo?: string;
}

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

    if (warehouse.status === 'fumigating') {
      const activePlan = await FumigationPlan.findOne({
        warehouseId,
        status: { $in: ['fumigating', 'ventilating', 'detection_pending', 'detection_passed'] }
      });

      if (activePlan) {
        return {
          allowed: false,
          reason: `仓房正在熏蒸作业中[计划号: ${activePlan.planNo}]，禁止普通入库单打开仓门`,
          fumigationPlanId: activePlan._id.toString(),
          planNo: activePlan.planNo
        };
      }

      const pendingPlan = await FumigationPlan.findOne({
        warehouseId,
        status: { $in: ['guard_pending', 'guard_confirmed', 'dosing_pending', 'evacuation_pending', 'dosing_completed'] }
      });

      if (pendingPlan) {
        return {
          allowed: false,
          reason: `仓房即将进行熏蒸作业[计划号: ${pendingPlan.planNo}]，禁止普通入库单打开仓门`,
          fumigationPlanId: pendingPlan._id.toString(),
          planNo: pendingPlan.planNo
        };
      }
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

    return { success: true, message: '仓房已成功解锁，恢复正常使用' };
  }

  static async getFumigatingWarehouses(): Promise<Array<{
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    planNo: string;
    status: string;
    startTime: Date;
  }>> {
    const plans = await FumigationPlan.find({
      status: { $in: ['fumigating', 'ventilating', 'detection_pending', 'detection_passed'] }
    }).sort({ createdAt: -1 });

    return plans.map(plan => ({
      warehouseId: plan.warehouseId,
      warehouseCode: plan.warehouseCode,
      warehouseName: plan.warehouseName,
      planNo: plan.planNo,
      status: plan.status,
      startTime: plan.actualStartDate || plan.createdAt
    }));
  }
}
