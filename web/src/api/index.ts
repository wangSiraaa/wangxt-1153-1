import { apiClient, handleApiResponse } from './client';
import type { 
  FumigationPlan, 
  GuardRecord, 
  DosingRecord, 
  VentilationRecord,
  Warehouse,
  Chemical,
  StockInOrder,
  ApiResponse 
} from '../types';

export const fumigationPlanApi = {
  getList: (params?: { status?: string; warehouseId?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/fumigation-plans', { params }).then(handleApiResponse<FumigationPlan[]>),
  
  getById: (id: string) =>
    apiClient.get(`/fumigation-plans/${id}`).then(handleApiResponse<FumigationPlan>),
  
  getDetails: (id: string) =>
    apiClient.get(`/fumigation-plans/${id}/details`).then(handleApiResponse<{
      plan: FumigationPlan;
      guardRecord: GuardRecord;
      dosingRecord: DosingRecord;
      ventilationRecord: VentilationRecord;
    }>),
  
  create: (data: Partial<FumigationPlan>) =>
    apiClient.post('/fumigation-plans', data).then(handleApiResponse<FumigationPlan>),
  
  update: (id: string, data: Partial<FumigationPlan>) =>
    apiClient.put(`/fumigation-plans/${id}`, data).then(handleApiResponse<FumigationPlan>),
  
  submit: (id: string, data: { operator: string; operatorName: string }) =>
    apiClient.post(`/fumigation-plans/${id}/submit`, data).then(handleApiResponse<FumigationPlan>),
  
  startProcess: (id: string, data: { operator: string; operatorName: string }) =>
    apiClient.post(`/fumigation-plans/${id}/start-process`, data).then(handleApiResponse<FumigationPlan>),
  
  transition: (id: string, targetStatus: string, data: { operator: string; operatorName: string; remark?: string }) =>
    apiClient.post(`/fumigation-plans/${id}/transition/${targetStatus}`, data).then(handleApiResponse<FumigationPlan>),
  
  delete: (id: string) =>
    apiClient.delete(`/fumigation-plans/${id}`).then(handleApiResponse)
};

export const guardRecordApi = {
  getList: (params?: { fumigationPlanId?: string }) =>
    apiClient.get('/guard-records', { params }).then(handleApiResponse<GuardRecord[]>),
  
  getById: (id: string) =>
    apiClient.get(`/guard-records/${id}`).then(handleApiResponse<GuardRecord>),
  
  create: (data: Partial<GuardRecord>) =>
    apiClient.post('/guard-records', data).then(handleApiResponse<GuardRecord>),
  
  update: (id: string, data: Partial<GuardRecord>) =>
    apiClient.put(`/guard-records/${id}`, data).then(handleApiResponse<GuardRecord>),
  
  confirm: (id: string) =>
    apiClient.post(`/guard-records/${id}/confirm`).then(handleApiResponse<GuardRecord>),
  
  release: (id: string, data: { operator: string; operatorName: string; releaseRemark?: string }) =>
    apiClient.post(`/guard-records/${id}/release`, data).then(handleApiResponse<GuardRecord>)
};

export const dosingRecordApi = {
  getList: (params?: { fumigationPlanId?: string }) =>
    apiClient.get('/dosing-records', { params }).then(handleApiResponse<DosingRecord[]>),
  
  getById: (id: string) =>
    apiClient.get(`/dosing-records/${id}`).then(handleApiResponse<DosingRecord>),
  
  create: (data: Partial<DosingRecord>) =>
    apiClient.post('/dosing-records', data).then(handleApiResponse<DosingRecord>),
  
  update: (id: string, data: Partial<DosingRecord>) =>
    apiClient.put(`/dosing-records/${id}`, data).then(handleApiResponse<DosingRecord>),
  
  confirmEvacuation: (id: string, data: { operator: string; operatorName: string }) =>
    apiClient.post(`/dosing-records/${id}/confirm-evacuation`, data).then(handleApiResponse<DosingRecord>),
  
  startDosing: (id: string) =>
    apiClient.post(`/dosing-records/${id}/start-dosing`).then(handleApiResponse<DosingRecord>),
  
  completeDosing: (id: string, data: { operator: string; operatorName: string }) =>
    apiClient.post(`/dosing-records/${id}/complete-dosing`, data).then(handleApiResponse<DosingRecord>),
  
  addEvacuationCheck: (id: string, data: { area: string; checked: boolean; checker: string; checkTime?: string }) =>
    apiClient.post(`/dosing-records/${id}/add-evacuation-check`, data).then(handleApiResponse<DosingRecord>),
  
  addPersonnel: (id: string, data: { name: string; role: string; idCard: string; contact: string }) =>
    apiClient.post(`/dosing-records/${id}/add-personnel`, data).then(handleApiResponse<DosingRecord>)
};

export const ventilationRecordApi = {
  getList: (params?: { fumigationPlanId?: string }) =>
    apiClient.get('/ventilation-records', { params }).then(handleApiResponse<VentilationRecord[]>),
  
  getById: (id: string) =>
    apiClient.get(`/ventilation-records/${id}`).then(handleApiResponse<VentilationRecord>),
  
  create: (data: Partial<VentilationRecord>) =>
    apiClient.post('/ventilation-records', data).then(handleApiResponse<VentilationRecord>),
  
  update: (id: string, data: Partial<VentilationRecord>) =>
    apiClient.put(`/ventilation-records/${id}`, data).then(handleApiResponse<VentilationRecord>),
  
  startVentilation: (id: string, data: { operator: string; operatorName: string }) =>
    apiClient.post(`/ventilation-records/${id}/start-ventilation`, data).then(handleApiResponse<VentilationRecord>),
  
  stopVentilation: (id: string) =>
    apiClient.post(`/ventilation-records/${id}/stop-ventilation`).then(handleApiResponse<VentilationRecord>),
  
  addDetection: (id: string, data: {
    detectionTime?: string;
    detector: string;
    detectorName: string;
    gasConcentration: number;
    detectionLocation: string;
    isQualified?: boolean;
    remark?: string;
    safeLimit?: number;
  }) =>
    apiClient.post(`/ventilation-records/${id}/add-detection`, data).then(handleApiResponse<VentilationRecord>),
  
  confirmQualified: (id: string, data: { operator: string; operatorName: string }) =>
    apiClient.post(`/ventilation-records/${id}/confirm-qualified`, data).then(handleApiResponse<VentilationRecord>)
};

export const warehouseApi = {
  getList: (params?: { status?: string }) =>
    apiClient.get('/warehouses', { params }).then(handleApiResponse<Warehouse[]>),
  
  getById: (id: string) =>
    apiClient.get(`/warehouses/${id}`).then(handleApiResponse<Warehouse>),
  
  create: (data: Partial<Warehouse>) =>
    apiClient.post('/warehouses', data).then(handleApiResponse<Warehouse>),
  
  update: (id: string, data: Partial<Warehouse>) =>
    apiClient.put(`/warehouses/${id}`, data).then(handleApiResponse<Warehouse>),
  
  delete: (id: string) =>
    apiClient.delete(`/warehouses/${id}`).then(handleApiResponse)
};

export const chemicalApi = {
  getList: () =>
    apiClient.get('/chemicals').then(handleApiResponse<Chemical[]>),
  
  getById: (id: string) =>
    apiClient.get(`/chemicals/${id}`).then(handleApiResponse<Chemical>),
  
  create: (data: Partial<Chemical>) =>
    apiClient.post('/chemicals', data).then(handleApiResponse<Chemical>),
  
  update: (id: string, data: Partial<Chemical>) =>
    apiClient.put(`/chemicals/${id}`, data).then(handleApiResponse<Chemical>),
  
  delete: (id: string) =>
    apiClient.delete(`/chemicals/${id}`).then(handleApiResponse)
};

export const doorControlApi = {
  checkWarehouseAccess: (warehouseId: string) =>
    apiClient.get(`/door-control/warehouse/${warehouseId}/check-access`).then(handleApiResponse),
  
  checkStockInAccess: (orderId: string, data: { warehouseId: string; operator: string; operatorName: string }) =>
    apiClient.post(`/door-control/stock-in/${orderId}/check-access`, data).then(handleApiResponse),
  
  lockWarehouse: (warehouseId: string, data: { fumigationPlanId: string }) =>
    apiClient.post(`/door-control/warehouse/${warehouseId}/lock`, data).then(handleApiResponse),
  
  unlockWarehouse: (warehouseId: string, data: { fumigationPlanId: string }) =>
    apiClient.post(`/door-control/warehouse/${warehouseId}/unlock`, data).then(handleApiResponse),
  
  getFumigatingWarehouses: () =>
    apiClient.get('/door-control/fumigating-warehouses').then(handleApiResponse)
};

export const stockInOrderApi = {
  getList: (params?: { status?: string; warehouseId?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/stock-in-orders', { params }).then(handleApiResponse<StockInOrder[]>),
  
  getById: (id: string) =>
    apiClient.get(`/stock-in-orders/${id}`).then(handleApiResponse<StockInOrder>),
  
  create: (data: Partial<StockInOrder>) =>
    apiClient.post('/stock-in-orders', data).then(handleApiResponse<StockInOrder>),
  
  accessDoor: (id: string, data: { operator: string; operatorName: string }) =>
    apiClient.post(`/stock-in-orders/${id}/access-door`, data).then(handleApiResponse),
  
  complete: (id: string) =>
    apiClient.post(`/stock-in-orders/${id}/complete`).then(handleApiResponse),
  
  cancel: (id: string) =>
    apiClient.post(`/stock-in-orders/${id}/cancel`).then(handleApiResponse)
};
