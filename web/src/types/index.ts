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
  | 'safety_review_pending'
  | 'safety_reviewed'
  | 'guard_pending'
  | 'guard_confirmed'
  | 'dosing_pending'
  | 'evacuation_pending'
  | 'dosing_completed'
  | 'fumigating'
  | 'ventilation_pending'
  | 'ventilating'
  | 'recheck_pending'
  | 'detection_pending'
  | 'detection_passed'
  | 'guard_released'
  | 'completed'
  | 'cancelled';

export const statusMap: Record<FumigationStatus, { label: string; color: string }> = {
  'draft': { label: '草稿', color: 'default' },
  'submitted': { label: '已提交待复核', color: 'blue' },
  'safety_review_pending': { label: '待安环员复核', color: 'orange' },
  'safety_reviewed': { label: '安环员已复核', color: 'cyan' },
  'guard_pending': { label: '待警戒确认', color: 'orange' },
  'guard_confirmed': { label: '警戒已确认', color: 'cyan' },
  'dosing_pending': { label: '待投药登记', color: 'orange' },
  'evacuation_pending': { label: '人员撤离中', color: 'orange' },
  'dosing_completed': { label: '投药完成', color: 'cyan' },
  'fumigating': { label: '熏蒸密闭中', color: 'red' },
  'ventilation_pending': { label: '待通风', color: 'orange' },
  'ventilating': { label: '通风散气中', color: 'cyan' },
  'recheck_pending': { label: '通风复检中', color: 'orange' },
  'detection_pending': { label: '待气体检测', color: 'orange' },
  'detection_passed': { label: '检测达标', color: 'green' },
  'guard_released': { label: '已解除警戒', color: 'green' },
  'completed': { label: '已完成归档', color: 'success' },
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

export interface WarningScopeDetail {
  direction: string;
  distance: number;
  description?: string;
}

export interface GuardPersonnel {
  name: string;
  position: string;
  contact: string;
  assignedZone?: string;
}

export interface FumigationPlan {
  _id: string;
  planNo: string;
  archiveNo?: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  grainType: string;
  grainQuantity?: number;
  warningScope: string;
  warningScopeDetail?: WarningScopeDetail[];
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
  safetyReviewStatus?: 'pending' | 'reviewed' | 'rejected';
  safetyReviewer?: string;
  safetyReviewerName?: string;
  safetyReviewedAt?: string;
  safetyReviewRemark?: string;
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
  warningScope?: string;
  warningScopeDetail?: WarningScopeDetail[];
  guardPersonnel?: GuardPersonnel[];
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
  isGuardConfirmed: boolean;
  guardConfirmedAt?: string;
  guardConfirmedBy?: string;
  guardConfirmedByName?: string;
  isGuardReleased: boolean;
  guardReleasedAt?: string;
  guardReleasedBy?: string;
  guardReleasedByName?: string;
  releaseRemark?: string;
  remarks: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvacuationPerson {
  name: string;
  role: string;
  idCard: string;
  contact: string;
  originalLocation?: string;
  evacuatedTo?: string;
  confirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface EvacuationCheckArea {
  area: string;
  personnelCount?: number;
  checked: boolean;
  checker?: string;
  checkerName?: string;
  checkTime?: string;
  remark?: string;
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
  evacuationList?: EvacuationPerson[];
  evacuationCompleted: boolean;
  allPersonnelEvacuated: boolean;
  evacuationCompletedAt?: string;
  evacuationConfirmedBy?: string;
  evacuationConfirmedByName?: string;
  guardConfirmed?: boolean;
  guardConfirmedAt?: string;
  guardConfirmedBy?: string;
  guardConfirmedByName?: string;
  guardRecordId?: string;
  actualDosage: number;
  dosageUnit?: string;
  dosingStatus?: 'pending' | 'in_progress' | 'completed';
  dosingStartTime?: string;
  dosingEndTime?: string;
  constructionLeader: string;
  constructionLeaderName: string;
  dosingOperator: string;
  dosingOperatorName: string;
  dosingMethod: string;
  dosingPoints: number;
  dosingRemarks: string;
  remark?: string;
  evacuationCheck: EvacuationCheckArea[];
  createdAt: string;
  updatedAt: string;
}

export interface RecheckRecord {
  recheckTime: string;
  rechecker: string;
  recheckerName: string;
  gasConcentration: number;
  recheckLocation: string;
  isQualified: boolean;
  isRecheck?: boolean;
  remark?: string;
}

export interface VentilationRecord {
  _id: string;
  fumigationPlanId: string;
  planNo: string;
  warehouseId: string;
  warehouseCode: string;
  ventilationStartTime?: string;
  ventilationEndTime?: string;
  ventilationDuration?: number;
  ventilationMethod: string;
  ventilationOperator: string;
  ventilationOperatorName: string;
  ventilationStatus?: 'pending' | 'ventilating' | 'completed';
  detectionRecords: Array<{
    detectionTime: string;
    detector: string;
    detectorName: string;
    gasConcentration: number;
    detectionLocation: string;
    isQualified: boolean;
    remark: string;
  }>;
  recheckRecords?: RecheckRecord[];
  recheckCount?: number;
  finalRecheckPassed?: boolean;
  finalConcentration: number;
  isQualified: boolean;
  qualifiedAt?: string;
  qualifiedBy?: string;
  qualifiedByName?: string;
  safetyOfficer: string;
  safetyOfficerName: string;
  ventilationRemarks: string;
  remark?: string;
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
  plannedQuantity?: number;
  quantity: number;
  actualQuantity?: number;
  operator: string;
  operatorName: string;
  approver?: string;
  approverName?: string;
  approvalAt?: string;
  operationStartAt?: string;
  operationCompletedAt?: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  blockedByFumigation?: boolean;
  blockedFumigationPlanId?: string;
  blockedFumigationPlanNo?: string;
  blockedFumigationStatus?: string;
  blockedAt?: string;
  fumigationBlockRemark?: string;
  doorAccessAttempted: boolean;
  doorAccessDenied: boolean;
  doorAccessDeniedReason: string;
  fumigationCheckPassed: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}
