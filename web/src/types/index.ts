export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export type FumigationStatus = 
  | 'draft'
  | 'submitted'
  | 'guard_pending'
  | 'guard_confirmed'
  | 'dosing_pending'
  | 'evacuation_pending'
  | 'dosing_completed'
  | 'fumigating'
  | 'ventilation_pending'
  | 'ventilating'
  | 'detection_pending'
  | 'detection_passed'
  | 'guard_released'
  | 'completed'
  | 'cancelled';

export const statusMap: Record<FumigationStatus, { label: string; color: string }> = {
  'draft': { label: '草稿', color: 'default' },
  'submitted': { label: '已提交', color: 'blue' },
  'guard_pending': { label: '待警戒确认', color: 'orange' },
  'guard_confirmed': { label: '警戒已确认', color: 'cyan' },
  'dosing_pending': { label: '待投药', color: 'orange' },
  'evacuation_pending': { label: '人员撤离中', color: 'orange' },
  'dosing_completed': { label: '投药完成', color: 'cyan' },
  'fumigating': { label: '熏蒸中', color: 'red' },
  'ventilation_pending': { label: '待通风', color: 'orange' },
  'ventilating': { label: '通风散气中', color: 'cyan' },
  'detection_pending': { label: '待检测', color: 'orange' },
  'detection_passed': { label: '检测达标', color: 'green' },
  'guard_released': { label: '已解除警戒', color: 'green' },
  'completed': { label: '已完成', color: 'success' },
  'cancelled': { label: '已取消', color: 'default' }
};

export interface Warehouse {
  _id: string;
  code: string;
  name: string;
  capacity: number;
  location: string;
  grainType: string;
  status: 'normal' | 'fumigating' | 'locked' | 'maintenance';
  currentFumigationPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chemical {
  _id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  toxicity: 'low' | 'medium' | 'high';
  safeExposureLimit: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface FumigationPlan {
  _id: string;
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  chemicalId: string;
  chemicalName: string;
  chemicalDosage: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  storageOperator: string;
  storageOperatorName: string;
  safetyOfficer?: string;
  safetyOfficerName?: string;
  constructionLeader?: string;
  constructionLeaderName?: string;
  status: FumigationStatus;
  statusHistory: Array<{
    status: FumigationStatus;
    operator: string;
    operatorName: string;
    timestamp: string;
    remark?: string;
  }>;
  guardRecordId?: string;
  dosingRecordId?: string;
  ventilationRecordId?: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuardRecord {
  _id: string;
  fumigationPlanId: string;
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  warningSigns: boolean;
  warningSignsDesc: string;
  ventilationFacility: boolean;
  ventilationFacilityDesc: string;
  evacuationRoute: boolean;
  evacuationRouteDesc: string;
  emergencyEquipment: boolean;
  emergencyEquipmentDesc: string;
  safetyOfficer: string;
  safetyOfficerName: string;
  guardConfirmedAt?: string;
  isGuardReleased: boolean;
  guardReleasedAt?: string;
  guardReleasedBy?: string;
  guardReleasedByName?: string;
  releaseRemark?: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface DosingRecord {
  _id: string;
  fumigationPlanId: string;
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  chemicalId: string;
  chemicalName: string;
  personnelList: Array<{
    name: string;
    role: string;
    idCard: string;
    contact: string;
  }>;
  evacuationCompleted: boolean;
  evacuationCompletedAt?: string;
  evacuationConfirmedBy?: string;
  evacuationConfirmedByName?: string;
  actualDosage: number;
  dosingStartTime?: string;
  dosingEndTime?: string;
  constructionLeader: string;
  constructionLeaderName: string;
  dosingOperator: string;
  dosingOperatorName: string;
  dosingMethod: string;
  dosingPoints: number;
  dosingRemarks: string;
  allPersonnelEvacuated: boolean;
  evacuationCheck: Array<{
    area: string;
    checked: boolean;
    checker: string;
    checkTime: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface VentilationRecord {
  _id: string;
  fumigationPlanId: string;
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  ventilationStartTime?: string;
  ventilationEndTime?: string;
  ventilationMethod: string;
  ventilationOperator: string;
  ventilationOperatorName: string;
  detectionRecords: Array<{
    detectionTime: string;
    detector: string;
    detectorName: string;
    gasConcentration: number;
    detectionLocation: string;
    isQualified: boolean;
    remark: string;
  }>;
  finalConcentration: number;
  isQualified: boolean;
  qualifiedAt?: string;
  qualifiedBy?: string;
  qualifiedByName?: string;
  safetyOfficer: string;
  safetyOfficerName: string;
  ventilationRemarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockInOrder {
  _id: string;
  orderNo: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  grainType: string;
  quantity: number;
  operator: string;
  operatorName: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  doorAccessAttempted: boolean;
  doorAccessDenied: boolean;
  doorAccessDeniedReason: string;
  fumigationCheckPassed: boolean;
  createdAt: string;
  updatedAt: string;
}
