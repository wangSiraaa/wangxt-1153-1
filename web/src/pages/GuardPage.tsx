import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Checkbox, 
  Input, 
  Card,
  App,
  Alert,
  Descriptions,
  Statistic,
  Row,
  Col
} from 'antd';
import { 
  SafetyOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  UnlockOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { fumigationPlanApi, guardRecordApi } from '../api';
import type { FumigationPlan, GuardRecord, FumigationStatus } from '../types';
import { statusMap } from '../types';
import dayjs from 'dayjs';

const { TextArea } = Input;

const GuardPage: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [plans, setPlans] = useState<FumigationPlan[]>([]);
  const [guardRecords, setGuardRecords] = useState<GuardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [releaseModalVisible, setReleaseModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FumigationPlan | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<GuardRecord | null>(null);
  const [form] = Form.useForm();
  const [releaseForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, recordsRes] = await Promise.all([
        fumigationPlanApi.getList({ pageSize: 100 }),
        guardRecordApi.getList()
      ]);
      
      if (plansRes.success && plansRes.data) {
        const guardRelatedPlans = plansRes.data.filter(p => 
          ['guard_pending', 'guard_confirmed', 'dosing_pending', 'evacuation_pending',
           'dosing_completed', 'fumigating', 'ventilation_pending', 'ventilating',
           'detection_pending', 'detection_passed'].includes(p.status)
        );
        setPlans(guardRelatedPlans);
      }
      
      if (recordsRes.success && recordsRes.data) {
        setGuardRecords(recordsRes.data);
      }
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getGuardRecord = (planId: string) => {
    return guardRecords.find(r => r.fumigationPlanId === planId);
  };

  const handleCreate = async (plan: FumigationPlan) => {
    try {
      const res = await guardRecordApi.create({
        fumigationPlanId: plan._id,
        planNo: plan.planNo,
        warehouseId: plan.warehouseId,
        warehouseCode: plan.warehouseCode,
        warningSigns: false,
        ventilationFacility: false,
        evacuationRoute: false,
        emergencyEquipment: false,
        safetyOfficer: 'user002',
        safetyOfficerName: '李四（安环员）'
      });
      
      if (res.success) {
        message.success('警戒记录已创建，请确认各项条件');
        setSelectedPlan(plan);
        setSelectedRecord(res.data as GuardRecord);
        form.setFieldsValue({
          warningSigns: false,
          ventilationFacility: false,
          evacuationRoute: false,
          emergencyEquipment: false
        });
        setConfirmModalVisible(true);
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleOpenConfirm = (plan: FumigationPlan) => {
    const record = getGuardRecord(plan._id);
    if (record) {
      setSelectedPlan(plan);
      setSelectedRecord(record);
      form.setFieldsValue({
        warningSigns: record.warningSigns,
        ventilationFacility: record.ventilationFacility,
        evacuationRoute: record.evacuationRoute,
        emergencyEquipment: record.emergencyEquipment,
        warningSignsDesc: record.warningSignsDesc,
        ventilationFacilityDesc: record.ventilationFacilityDesc,
        evacuationRouteDesc: record.evacuationRouteDesc,
        emergencyEquipmentDesc: record.emergencyEquipmentDesc
      });
      setConfirmModalVisible(true);
    }
  };

  const handleConfirm = async (values: any) => {
    if (!selectedRecord) return;
    
    try {
      await guardRecordApi.update(selectedRecord._id, values);
      const res = await guardRecordApi.confirm(selectedRecord._id);
      
      if (res.success) {
        message.success('警戒条件已确认，可以进入投药阶段');
        setConfirmModalVisible(false);
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '确认失败');
    }
  };

  const handleOpenRelease = (plan: FumigationPlan) => {
    const record = getGuardRecord(plan._id);
    if (record && plan.status === 'detection_passed') {
      setSelectedPlan(plan);
      setSelectedRecord(record);
      setReleaseModalVisible(true);
    } else {
      message.warning('通风检测未达标，不能解除警戒');
    }
  };

  const handleRelease = async (values: any) => {
    if (!selectedRecord) return;
    
    try {
      const res = await guardRecordApi.release(selectedRecord._id, {
        operator: 'user002',
        operatorName: '李四（安环员）',
        releaseRemark: values.releaseRemark
      });
      
      if (res.success) {
        message.success('警戒已解除，仓房恢复正常使用');
        setReleaseModalVisible(false);
        releaseForm.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '解除失败');
    }
  };

  const columns: ColumnsType<FumigationPlan> = [
    {
      title: '计划编号',
      dataIndex: 'planNo',
      key: 'planNo',
      width: 160,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
    },
    {
      title: '仓房',
      dataIndex: 'warehouseName',
      key: 'warehouseName',
      width: 120
    },
    {
      title: '药剂',
      dataIndex: 'chemicalName',
      key: 'chemicalName',
      width: 100
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: FumigationStatus) => {
        const info = statusMap[status];
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: '警戒状态',
      key: 'guardStatus',
      width: 120,
      render: (_, record) => {
        const gr = getGuardRecord(record._id);
        if (!gr) {
          return <Tag color="default">待创建</Tag>;
        }
        if (gr.isGuardReleased) {
          return <Tag color="success">已解除</Tag>;
        }
        if (gr.guardConfirmedAt) {
          return <Tag color="processing">警戒中</Tag>;
        }
        return <Tag color="warning">待确认</Tag>;
      }
    },
    {
      title: '安环员',
      key: 'safetyOfficer',
      width: 120,
      render: (_, record) => {
        const gr = getGuardRecord(record._id);
        return gr?.safetyOfficerName || record.safetyOfficerName || '-';
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      fixed: 'right',
      render: (_, record) => {
        const gr = getGuardRecord(record._id);
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/plans/${record._id}`)}
            >
              查看详情
            </Button>
            {record.status === 'guard_pending' && !gr && (
              <Button
                type="primary"
                size="small"
                icon={<SafetyOutlined />}
                onClick={() => handleCreate(record)}
              >
                创建警戒记录
              </Button>
            )}
            {record.status === 'guard_pending' && gr && !gr.guardConfirmedAt && (
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleOpenConfirm(record)}
              >
                确认警戒
              </Button>
            )}
            {record.status === 'detection_passed' && gr && gr.guardConfirmedAt && !gr.isGuardReleased && (
              <Button
                type="primary"
                size="small"
                danger
                icon={<UnlockOutlined />}
                onClick={() => handleOpenRelease(record)}
              >
                解除警戒
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  const pendingCount = plans.filter(p => p.status === 'guard_pending').length;
  const activeCount = plans.filter(p => {
    const gr = getGuardRecord(p._id);
    return gr?.guardConfirmedAt && !gr?.isGuardReleased;
  }).length;
  const releasedCount = plans.filter(p => {
    const gr = getGuardRecord(p._id);
    return gr?.isGuardReleased;
  }).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>警戒确认管理</h2>
        <p style={{ color: '#666', marginTop: 4 }}>安环员确认警戒和通风条件，管理警戒解除</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card warning">
            <div style={{ fontSize: 28, marginBottom: 4 }}><WarningOutlined /></div>
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">待确认警戒</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card info">
            <div style={{ fontSize: 28, marginBottom: 4 }}><SafetyOutlined /></div>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">警戒中</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card success">
            <div style={{ fontSize: 28, marginBottom: 4 }}><CheckCircleOutlined /></div>
            <div className="stat-value">{releasedCount}</div>
            <div className="stat-label">已解除警戒</div>
          </Card>
        </Col>
      </Row>

      <Alert
        message="安全提示"
        description="人员未撤离不能投药，通风检测未达标不能解除警戒，熏蒸期间仓门禁止被普通入库单打开。"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card className="page-content">
        <Table
          columns={columns}
          dataSource={plans}
          loading={loading}
          rowKey="_id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title="警戒条件确认"
        open={confirmModalVisible}
        onCancel={() => setConfirmModalVisible(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        {selectedPlan && (
          <div style={{ marginBottom: 16 }}>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="计划编号">{selectedPlan.planNo}</Descriptions.Item>
              <Descriptions.Item label="仓房">{selectedPlan.warehouseName}</Descriptions.Item>
              <Descriptions.Item label="药剂">{selectedPlan.chemicalName}</Descriptions.Item>
              <Descriptions.Item label="计划开始">{dayjs(selectedPlan.plannedStartDate).format('YYYY-MM-DD')}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
        
        <Alert
          message="请逐项确认以下警戒条件，全部满足后才能确认"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleConfirm}
        >
          <div className="check-item">
            <Form.Item
              name="warningSigns"
              valuePropName="checked"
              rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请确认警示牌已设置')) }]}
            >
              <Checkbox>
                <strong>警示牌已设置</strong> - 在仓房周围设置明显的熏蒸警示标志，禁止无关人员进入
              </Checkbox>
            </Form.Item>
            <Form.Item name="warningSignsDesc" noStyle>
              <Input.TextArea rows={2} placeholder="请描述警示牌设置情况" />
            </Form.Item>
          </div>

          <div className="check-item">
            <Form.Item
              name="ventilationFacility"
              valuePropName="checked"
              rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请确认通风设施正常')) }]}
            >
              <Checkbox>
                <strong>通风设施正常</strong> - 检查风机、通风口等设备状态良好，能正常运行
              </Checkbox>
            </Form.Item>
            <Form.Item name="ventilationFacilityDesc" noStyle>
              <Input.TextArea rows={2} placeholder="请描述通风设施检查情况" />
            </Form.Item>
          </div>

          <div className="check-item">
            <Form.Item
              name="evacuationRoute"
              valuePropName="checked"
              rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请确认撤离路线畅通')) }]}
            >
              <Checkbox>
                <strong>撤离路线畅通</strong> - 确保紧急撤离通道无障碍物，标识清晰
              </Checkbox>
            </Form.Item>
            <Form.Item name="evacuationRouteDesc" noStyle>
              <Input.TextArea rows={2} placeholder="请描述撤离路线检查情况" />
            </Form.Item>
          </div>

          <div className="check-item">
            <Form.Item
              name="emergencyEquipment"
              valuePropName="checked"
              rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请确认应急设备齐全')) }]}
            >
              <Checkbox>
                <strong>应急设备齐全</strong> - 配备防毒面具、防护服、急救药品等应急物资
              </Checkbox>
            </Form.Item>
            <Form.Item name="emergencyEquipmentDesc" noStyle>
              <Input.TextArea rows={2} placeholder="请描述应急设备配置情况" />
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setConfirmModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                确认警戒条件
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="解除警戒"
        open={releaseModalVisible}
        onCancel={() => setReleaseModalVisible(false)}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Alert
          message="解除警戒前请确认"
          description="通风检测必须达标，气体浓度低于安全限值，确保人员可以安全进入。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {selectedRecord && (
          <div style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="最终气体浓度"
                  value={selectedRecord.fumigationPlanId ? 0.15 : 0}
                  suffix="mg/m³"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="安全限值"
                  value={0.3}
                  suffix="mg/m³"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </div>
        )}

        <Form
          form={releaseForm}
          layout="vertical"
          onFinish={handleRelease}
        >
          <Form.Item
            name="releaseRemark"
            label="解除原因说明"
          >
            <TextArea rows={3} placeholder="请输入解除警戒的原因说明" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setReleaseModalVisible(false)}>取消</Button>
              <Button type="primary" danger htmlType="submit" icon={<UnlockOutlined />}>
                确认解除警戒
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GuardPage;
