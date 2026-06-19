import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Timeline, 
  Tag, 
  Button, 
  Space, 
  Divider,
  App,
  Row,
  Col,
  Statistic,
  Steps
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyOutlined,
  MedicineBoxOutlined,
  CloudOutlined
} from '@ant-design/icons';
import { fumigationPlanApi } from '../api';
import type { FumigationPlan, GuardRecord, DosingRecord, VentilationRecord, FumigationStatus } from '../types';
import { statusMap } from '../types';
import dayjs from 'dayjs';

const PlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [plan, setPlan] = useState<FumigationPlan | null>(null);
  const [guardRecord, setGuardRecord] = useState<GuardRecord | null>(null);
  const [dosingRecord, setDosingRecord] = useState<DosingRecord | null>(null);
  const [ventilationRecord, setVentilationRecord] = useState<VentilationRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fumigationPlanApi.getDetails(id);
      if (res.success && res.data) {
        setPlan(res.data.plan);
        setGuardRecord(res.data.guardRecord);
        setDosingRecord(res.data.dosingRecord);
        setVentilationRecord(res.data.ventilationRecord);
      }
    } catch (error) {
      message.error('加载详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!plan) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  const stepItems = [
    {
      title: '计划提交',
      status: (['draft', 'submitted'].includes(plan.status) ? 'process' : 'finish') as 'process' | 'finish' | 'wait' | 'error',
      icon: <CheckCircleOutlined />
    },
    {
      title: '警戒确认',
      status: (plan.status === 'guard_pending' ? 'process' : 
              ['guard_confirmed', 'dosing_pending', 'evacuation_pending', 'dosing_completed', 'fumigating',
               'ventilation_pending', 'ventilating', 'detection_pending', 'detection_passed',
               'guard_released', 'completed'].includes(plan.status) ? 'finish' : 'wait') as 'process' | 'finish' | 'wait' | 'error',
      icon: <SafetyOutlined />
    },
    {
      title: '投药作业',
      status: (['dosing_pending', 'evacuation_pending'].includes(plan.status) ? 'process' :
              ['dosing_completed', 'fumigating', 'ventilation_pending', 'ventilating',
               'detection_pending', 'detection_passed', 'guard_released', 'completed'].includes(plan.status) ? 'finish' : 'wait') as 'process' | 'finish' | 'wait' | 'error',
      icon: <MedicineBoxOutlined />
    },
    {
      title: '熏蒸密闭',
      status: (plan.status === 'fumigating' ? 'process' :
              ['ventilation_pending', 'ventilating', 'detection_pending', 'detection_passed',
               'guard_released', 'completed'].includes(plan.status) ? 'finish' : 'wait') as 'process' | 'finish' | 'wait' | 'error',
      icon: <ClockCircleOutlined />
    },
    {
      title: '通风检测',
      status: (['ventilation_pending', 'ventilating', 'detection_pending'].includes(plan.status) ? 'process' :
              ['detection_passed', 'guard_released', 'completed'].includes(plan.status) ? 'finish' : 'wait') as 'process' | 'finish' | 'wait' | 'error',
      icon: <CloudOutlined />
    },
    {
      title: '解除警戒',
      status: (plan.status === 'guard_released' ? 'process' :
              plan.status === 'completed' ? 'finish' : 'wait') as 'process' | 'finish' | 'wait' | 'error',
      icon: <CheckCircleOutlined />
    }
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/plans')}>
          返回计划列表
        </Button>
      </div>

      <Card className="page-content" loading={loading} title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>熏蒸计划详情</span>
          <Tag color={statusMap[plan.status].color}>{statusMap[plan.status].label}</Tag>
          <span style={{ fontFamily: 'monospace', color: '#666' }}>{plan.planNo}</span>
        </div>
      }>
        <Steps items={stepItems} size="small" style={{ marginBottom: 24 }} />

        <Divider orientation="left">基本信息</Divider>
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="仓房">{plan.warehouseName} ({plan.warehouseCode})</Descriptions.Item>
          <Descriptions.Item label="药剂">{plan.chemicalName}</Descriptions.Item>
          <Descriptions.Item label="用药量">{plan.chemicalDosage} kg</Descriptions.Item>
          <Descriptions.Item label="仓储员">{plan.storageOperatorName}</Descriptions.Item>
          <Descriptions.Item label="计划开始">{dayjs(plan.plannedStartDate).format('YYYY-MM-DD')}</Descriptions.Item>
          <Descriptions.Item label="计划结束">{dayjs(plan.plannedEndDate).format('YYYY-MM-DD')}</Descriptions.Item>
          {plan.actualStartDate && (
            <Descriptions.Item label="实际开始">{dayjs(plan.actualStartDate).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          )}
          {plan.actualEndDate && (
            <Descriptions.Item label="实际结束">{dayjs(plan.actualEndDate).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          )}
          {plan.safetyOfficerName && (
            <Descriptions.Item label="安环员">{plan.safetyOfficerName}</Descriptions.Item>
          )}
          {plan.constructionLeaderName && (
            <Descriptions.Item label="施工负责人">{plan.constructionLeaderName}</Descriptions.Item>
          )}
          {plan.remark && (
            <Descriptions.Item label="备注" span={2}>{plan.remark}</Descriptions.Item>
          )}
        </Descriptions>

        {guardRecord && (
          <>
            <Divider orientation="left">警戒记录</Divider>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic 
                    title="警示牌" 
                    value={guardRecord.warningSigns ? '已设置' : '未设置'}
                    valueStyle={{ color: guardRecord.warningSigns ? '#52c41a' : '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic 
                    title="通风设施" 
                    value={guardRecord.ventilationFacility ? '正常' : '异常'}
                    valueStyle={{ color: guardRecord.ventilationFacility ? '#52c41a' : '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic 
                    title="撤离路线" 
                    value={guardRecord.evacuationRoute ? '已确认' : '未确认'}
                    valueStyle={{ color: guardRecord.evacuationRoute ? '#52c41a' : '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small">
                  <Statistic 
                    title="应急设备" 
                    value={guardRecord.emergencyEquipment ? '已检查' : '未检查'}
                    valueStyle={{ color: guardRecord.emergencyEquipment ? '#52c41a' : '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}

        {dosingRecord && (
          <>
            <Divider orientation="left">投药记录</Divider>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="施工负责人">{dosingRecord.constructionLeaderName}</Descriptions.Item>
              <Descriptions.Item label="作业人员">{dosingRecord.personnelList.length} 人</Descriptions.Item>
              <Descriptions.Item label="实际用药量">{dosingRecord.actualDosage} kg</Descriptions.Item>
              <Descriptions.Item label="投药点数">{dosingRecord.dosingPoints} 个</Descriptions.Item>
              <Descriptions.Item label="人员撤离">
                <Tag color={dosingRecord.evacuationCompleted ? 'success' : 'warning'}>
                  {dosingRecord.evacuationCompleted ? '已完成' : '未完成'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="全员撤离">
                <Tag color={dosingRecord.allPersonnelEvacuated ? 'success' : 'warning'}>
                  {dosingRecord.allPersonnelEvacuated ? '已确认' : '未确认'}
                </Tag>
              </Descriptions.Item>
              {dosingRecord.dosingStartTime && (
                <Descriptions.Item label="投药开始">
                  {dayjs(dosingRecord.dosingStartTime).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {dosingRecord.dosingEndTime && (
                <Descriptions.Item label="投药结束">
                  {dayjs(dosingRecord.dosingEndTime).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">作业人员名单</Divider>
            <div style={{ marginBottom: 16 }}>
              {dosingRecord.personnelList.map((p, idx) => (
                <Tag key={idx} style={{ marginBottom: 4 }}>
                  {p.name} - {p.role}
                </Tag>
              ))}
            </div>
          </>
        )}

        {ventilationRecord && (
          <>
            <Divider orientation="left">通风检测记录</Divider>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="通风方式">{ventilationRecord.ventilationMethod || '-'}</Descriptions.Item>
              <Descriptions.Item label="最终浓度">
                <span style={{ 
                  color: ventilationRecord.isQualified ? '#52c41a' : '#ff4d4f',
                  fontWeight: 'bold'
                }}>
                  {ventilationRecord.finalConcentration} mg/m³
                </span>
              </Descriptions.Item>
              {ventilationRecord.ventilationStartTime && (
                <Descriptions.Item label="通风开始">
                  {dayjs(ventilationRecord.ventilationStartTime).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              {ventilationRecord.ventilationEndTime && (
                <Descriptions.Item label="通风结束">
                  {dayjs(ventilationRecord.ventilationEndTime).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="检测结果">
                <Tag color={ventilationRecord.isQualified ? 'success' : 'warning'}>
                  {ventilationRecord.isQualified ? '达标' : '未达标'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="检测次数">{ventilationRecord.detectionRecords.length} 次</Descriptions.Item>
            </Descriptions>

            {ventilationRecord.detectionRecords.length > 0 && (
              <>
                <Divider orientation="left">气体检测记录</Divider>
                <div className="table-card">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        <th style={{ padding: '8px 12px', border: '1px solid #f0f0f0' }}>检测时间</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #f0f0f0' }}>检测人</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #f0f0f0' }}>检测位置</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #f0f0f0' }}>浓度 (mg/m³)</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #f0f0f0' }}>结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventilationRecord.detectionRecords.map((rec, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '8px 12px', border: '1px solid #f0f0f0' }}>
                            {dayjs(rec.detectionTime).format('YYYY-MM-DD HH:mm')}
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #f0f0f0' }}>{rec.detectorName}</td>
                          <td style={{ padding: '8px 12px', border: '1px solid #f0f0f0' }}>{rec.detectionLocation}</td>
                          <td style={{ padding: '8px 12px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <span style={{ 
                              color: rec.isQualified ? '#52c41a' : '#ff4d4f',
                              fontWeight: 'bold'
                            }}>
                              {rec.gasConcentration}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                            <Tag color={rec.isQualified ? 'success' : 'warning'}>
                              {rec.isQualified ? '达标' : '未达标'}
                            </Tag>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <Divider orientation="left">状态流转记录</Divider>
        <div className="status-timeline">
          <Timeline
            items={plan.statusHistory.map((h, idx) => ({
              color: idx === plan.statusHistory.length - 1 ? 'blue' : 'gray',
              children: (
                <div>
                  <Space>
                    <Tag color={statusMap[h.status as FumigationStatus].color}>
                      {statusMap[h.status as FumigationStatus].label}
                    </Tag>
                    <span style={{ color: '#666' }}>
                      {dayjs(h.timestamp).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </Space>
                  <div style={{ marginTop: 4 }}>
                    操作人：{h.operatorName}
                    {h.remark && <span style={{ marginLeft: 12, color: '#888' }}>备注：{h.remark}</span>}
                  </div>
                </div>
              )
            }))}
          />
        </div>
      </Card>
    </div>
  );
};

export default PlanDetail;
