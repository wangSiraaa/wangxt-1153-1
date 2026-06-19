import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Card,
  App,
  Alert,
  Descriptions,
  Statistic,
  Row,
  Col,
  Progress,
  List,
  Select
} from 'antd';
import { 
  CloudOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  StopOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { fumigationPlanApi, ventilationRecordApi, chemicalApi } from '../api';
import type { FumigationPlan, VentilationRecord, Chemical, FumigationStatus } from '../types';
import { statusMap } from '../types';
import dayjs from 'dayjs';

const VentilationPage: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [plans, setPlans] = useState<FumigationPlan[]>([]);
  const [ventilationRecords, setVentilationRecords] = useState<VentilationRecord[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [detectionModalVisible, setDetectionModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FumigationPlan | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<VentilationRecord | null>(null);
  const [form] = Form.useForm();
  const [detectionForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, recordsRes, chemRes] = await Promise.all([
        fumigationPlanApi.getList({ pageSize: 100 }),
        ventilationRecordApi.getList(),
        chemicalApi.getList()
      ]);
      
      if (plansRes.success && plansRes.data) {
        const ventRelatedPlans = plansRes.data.filter(p => 
          ['fumigating', 'ventilation_pending', 'ventilating', 'detection_pending', 'detection_passed'].includes(p.status)
        );
        setPlans(ventRelatedPlans);
      }
      
      if (recordsRes.success && recordsRes.data) {
        setVentilationRecords(recordsRes.data);
      }

      if (chemRes.success && chemRes.data) {
        setChemicals(chemRes.data);
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

  const getVentilationRecord = (planId: string) => {
    return ventilationRecords.find(r => r.fumigationPlanId === planId);
  };

  const getSafeLimit = (chemicalName: string) => {
    const chem = chemicals.find(c => c.name === chemicalName);
    return chem?.safeExposureLimit || 0.3;
  };

  const handleCreate = async (plan: FumigationPlan) => {
    try {
      const res = await ventilationRecordApi.create({
        fumigationPlanId: plan._id,
        planNo: plan.planNo,
        warehouseId: plan.warehouseId,
        warehouseCode: plan.warehouseCode,
        detectionRecords: [],
        finalConcentration: 0,
        isQualified: false,
        ventilationMethod: '机械通风',
        ventilationOperator: 'user003',
        ventilationOperatorName: '王五（施工负责人）',
        safetyOfficer: 'user002',
        safetyOfficerName: '李四（安环员）'
      });
      
      if (res.success) {
        message.success('通风检测记录已创建');
        setSelectedPlan(plan);
        setSelectedRecord(res.data as VentilationRecord);
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleOpenRecord = (plan: FumigationPlan) => {
    const record = getVentilationRecord(plan._id);
    if (record) {
      setSelectedPlan(plan);
      setSelectedRecord(record);
      form.setFieldsValue({
        ventilationMethod: record.ventilationMethod,
        ventilationRemarks: record.ventilationRemarks
      });
      setRecordModalVisible(true);
    }
  };

  const handleSaveRecord = async (values: any) => {
    if (!selectedRecord) return;
    
    try {
      await ventilationRecordApi.update(selectedRecord._id, values);
      message.success('记录已保存');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    }
  };

  const handleStartVentilation = async () => {
    if (!selectedRecord) return;
    
    modal.confirm({
      title: '开始通风散气',
      content: '确认开始通风散气？请确保通风设备已正常启动。',
      onOk: async () => {
        try {
          await ventilationRecordApi.startVentilation(selectedRecord._id, {
            operator: 'user003',
            operatorName: '王五（施工负责人）'
          });
          message.success('通风已开始');
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || '开始通风失败');
        }
      }
    });
  };

  const handleStopVentilation = async () => {
    if (!selectedRecord) return;
    
    modal.confirm({
      title: '停止通风',
      content: '确认停止通风？停止后将进入气体检测阶段。',
      onOk: async () => {
        try {
          await ventilationRecordApi.stopVentilation(selectedRecord._id);
          message.success('通风已停止，请进行气体浓度检测');
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || '停止通风失败');
        }
      }
    });
  };

  const handleAddDetection = async (values: any) => {
    if (!selectedRecord || !selectedPlan) return;
    
    const safeLimit = getSafeLimit(selectedPlan.chemicalName);
    
    try {
      const res = await ventilationRecordApi.addDetection(selectedRecord._id, {
        ...values,
        detector: 'user002',
        detectorName: '李四（安环员）',
        safeLimit
      });
      
      if (res.success) {
        const data = res.data as VentilationRecord;
        if (data.isQualified) {
          message.success(`检测达标！浓度 ${values.gasConcentration} mg/m³`);
        } else {
          message.warning(`检测未达标，浓度 ${values.gasConcentration} mg/m³，请继续通风`);
        }
        setDetectionModalVisible(false);
        detectionForm.resetFields();
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加失败');
    }
  };

  const handleConfirmQualified = async () => {
    if (!selectedRecord) return;
    
    modal.confirm({
      title: '确认检测达标',
      content: (
        <div>
          <p>请确认气体浓度检测已达标，可以解除警戒。</p>
          <p className="warning-text">确认后将允许安环员解除警戒。</p>
        </div>
      ),
      onOk: async () => {
        try {
          await ventilationRecordApi.confirmQualified(selectedRecord._id, {
            operator: 'user002',
            operatorName: '李四（安环员）'
          });
          message.success('检测达标已确认');
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || '确认失败');
        }
      }
    });
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
      title: '最终浓度',
      key: 'concentration',
      width: 120,
      render: (_, record) => {
        const vr = getVentilationRecord(record._id);
        if (!vr || vr.finalConcentration === 0) return '-';
        const safeLimit = getSafeLimit(record.chemicalName);
        const isQualified = vr.finalConcentration <= safeLimit;
        return (
          <span style={{ 
            color: isQualified ? '#52c41a' : '#ff4d4f',
            fontWeight: 'bold'
          }}>
            {vr.finalConcentration} mg/m³
          </span>
        );
      }
    },
    {
      title: '检测次数',
      key: 'detectionCount',
      width: 100,
      render: (_, record) => {
        const vr = getVentilationRecord(record._id);
        return vr ? `${vr.detectionRecords.length} 次` : '-';
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => {
        const vr = getVentilationRecord(record._id);
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/plans/${record._id}`)}
            >
              详情
            </Button>
            {record.status === 'fumigating' && !vr && (
              <Button
                type="primary"
                size="small"
                icon={<CloudOutlined />}
                onClick={() => handleCreate(record)}
              >
                创建通风记录
              </Button>
            )}
            {vr && ['ventilation_pending', 'ventilating', 'detection_pending', 'detection_passed'].includes(record.status) && (
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleOpenRecord(record)}
              >
                通风检测
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  const ventilatingCount = plans.filter(p => p.status === 'ventilating').length;
  const detectionCount = plans.filter(p => p.status === 'detection_pending').length;
  const qualifiedCount = plans.filter(p => p.status === 'detection_passed').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>通风检测管理</h2>
        <p style={{ color: '#666', marginTop: 4 }}>通风散气和气体浓度检测，检测达标后解除警戒</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card info">
            <div style={{ fontSize: 28, marginBottom: 4 }}><CloudOutlined /></div>
            <div className="stat-value">{ventilatingCount}</div>
            <div className="stat-label">通风散气中</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card warning">
            <div style={{ fontSize: 28, marginBottom: 4 }}><WarningOutlined /></div>
            <div className="stat-value">{detectionCount}</div>
            <div className="stat-label">待检测</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card success">
            <div style={{ fontSize: 28, marginBottom: 4 }}><CheckCircleOutlined /></div>
            <div className="stat-value">{qualifiedCount}</div>
            <div className="stat-label">检测达标</div>
          </Card>
        </Col>
      </Row>

      <Alert
        message="安全规则"
        description={
          <div>
            <p><strong>通风检测未达标不能解除警戒</strong> - 必须确认气体浓度低于安全限值才能解除警戒。</p>
          </div>
        }
        type="error"
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
        title="通风检测管理"
        open={recordModalVisible}
        onCancel={() => setRecordModalVisible(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {selectedPlan && selectedRecord && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="当前气体浓度"
                    value={selectedRecord.finalConcentration}
                    suffix="mg/m³"
                    valueStyle={{ 
                      color: selectedRecord.isQualified ? '#52c41a' : '#ff4d4f',
                      fontWeight: 'bold'
                    }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="安全限值"
                    value={getSafeLimit(selectedPlan.chemicalName)}
                    suffix="mg/m³"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="达标进度"
                    formatter={() => (
                      <Progress
                        type="circle"
                        size={60}
                        percent={selectedRecord.isQualified ? 100 : Math.min(99, (getSafeLimit(selectedPlan.chemicalName) / Math.max(selectedRecord.finalConcentration, 0.01)) * 100)}
                        status={selectedRecord.isQualified ? 'success' : 'active'}
                      />
                    )}
                  />
                </Card>
              </Col>
            </Row>

            <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="计划编号">{selectedPlan.planNo}</Descriptions.Item>
              <Descriptions.Item label="仓房">{selectedPlan.warehouseName}</Descriptions.Item>
              <Descriptions.Item label="药剂">{selectedPlan.chemicalName}</Descriptions.Item>
              <Descriptions.Item label="通风方式">
                {selectedRecord.ventilationStartTime ? selectedRecord.ventilationMethod : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="通风开始">
                {selectedRecord.ventilationStartTime 
                  ? dayjs(selectedRecord.ventilationStartTime).format('YYYY-MM-DD HH:mm') 
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="通风结束">
                {selectedRecord.ventilationEndTime 
                  ? dayjs(selectedRecord.ventilationEndTime).format('YYYY-MM-DD HH:mm') 
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            {!selectedRecord.ventilationEndTime && (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSaveRecord}
                style={{ marginBottom: 16 }}
              >
                <Form.Item
                  name="ventilationMethod"
                  label="通风方式"
                  rules={[{ required: true, message: '请选择通风方式' }]}
                >
                  <Select placeholder="请选择通风方式">
                    <Select.Option value="机械通风">机械通风</Select.Option>
                    <Select.Option value="自然通风">自然通风</Select.Option>
                    <Select.Option value="环流通风">环流通风</Select.Option>
                    <Select.Option value="负压通风">负压通风</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="ventilationRemarks"
                  label="备注"
                >
                  <Input.TextArea rows={2} placeholder="请输入通风备注" />
                </Form.Item>

                {!selectedRecord.ventilationStartTime && (
                  <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                    <Space>
                      <Button htmlType="submit">保存</Button>
                      <Button 
                        type="primary" 
                        icon={<PlayCircleOutlined />}
                        onClick={handleStartVentilation}
                      >
                        开始通风
                      </Button>
                    </Space>
                  </Form.Item>
                )}
                {selectedRecord.ventilationStartTime && !selectedRecord.ventilationEndTime && (
                  <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                    <Space>
                      <Button 
                        type="primary" 
                        danger
                        icon={<StopOutlined />}
                        onClick={handleStopVentilation}
                      >
                        停止通风
                      </Button>
                    </Space>
                  </Form.Item>
                )}
              </Form>
            )}

            {selectedRecord.ventilationEndTime && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 'bold' }}>
                    气体检测记录 ({selectedRecord.detectionRecords.length} 次)
                  </span>
                  {!selectedRecord.isQualified && (
                    <Button 
                      type="primary" 
                      size="small" 
                      icon={<PlusOutlined />}
                      onClick={() => setDetectionModalVisible(true)}
                    >
                      添加检测
                    </Button>
                  )}
                </div>

                {selectedRecord.detectionRecords.length > 0 ? (
                  <List
                    size="small"
                    bordered
                    dataSource={[...selectedRecord.detectionRecords].reverse()}
                    renderItem={(item, idx) => (
                      <List.Item key={idx}>
                        <List.Item.Meta
                          title={
                            <Space>
                              <span>{dayjs(item.detectionTime).format('YYYY-MM-DD HH:mm')}</span>
                              <span style={{ color: '#666' }}>{item.detectionLocation}</span>
                              <Tag color={item.isQualified ? 'success' : 'warning'}>
                                {item.isQualified ? '达标' : '未达标'}
                              </Tag>
                            </Space>
                          }
                          description={
                            <div>
                              <span>检测人: {item.detectorName}</span>
                              <span style={{ marginLeft: 16 }}>
                                浓度: <strong style={{ 
                                  color: item.isQualified ? '#52c41a' : '#ff4d4f'
                                }}>
                                  {item.gasConcentration} mg/m³
                                </strong>
                              </span>
                              {item.remark && <span style={{ marginLeft: 16, color: '#888' }}>备注: {item.remark}</span>}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Alert type="info" message="请进行气体浓度检测" showIcon />
                )}

                {selectedRecord.isQualified && (
                  <Alert
                    style={{ marginTop: 16 }}
                    message="检测达标"
                    description={`气体浓度 ${selectedRecord.finalConcentration} mg/m³，低于安全限值 ${getSafeLimit(selectedPlan.chemicalName)} mg/m³。请前往警戒确认页面解除警戒。`}
                    type="success"
                    showIcon
                    action={
                      !selectedPlan.status.includes('passed') && (
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={handleConfirmQualified}
                        >
                          确认达标
                        </Button>
                      )
                    }
                  />
                )}

                {!selectedRecord.isQualified && selectedRecord.detectionRecords.length > 0 && (
                  <Alert
                    style={{ marginTop: 16 }}
                    message="检测未达标"
                    description="气体浓度仍高于安全限值，请继续通风散气后重新检测。"
                    type="warning"
                    showIcon
                    action={
                      <Space>
                        <Button size="small" onClick={() => setRecordModalVisible(false)}>
                          返回列表
                        </Button>
                        <Button 
                          type="primary" 
                          size="small"
                          onClick={() => {
                            setRecordModalVisible(false);
                            navigate('/ventilation');
                          }}
                        >
                          继续通风
                        </Button>
                      </Space>
                    }
                  />
                )}
              </>
            )}
          </>
        )}
      </Modal>

      <Modal
        title="添加气体检测记录"
        open={detectionModalVisible}
        onCancel={() => setDetectionModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        {selectedPlan && (
          <Alert
            style={{ marginBottom: 16 }}
            message="安全限值参考"
            description={`${selectedPlan.chemicalName} 安全暴露限值为 ${getSafeLimit(selectedPlan.chemicalName)} mg/m³`}
            type="info"
            showIcon
          />
        )}
        <Form
          form={detectionForm}
          layout="vertical"
          onFinish={handleAddDetection}
        >
          <Form.Item
            name="detectionLocation"
            label="检测位置"
            rules={[{ required: true, message: '请输入检测位置' }]}
          >
            <Select placeholder="请选择检测位置">
              <Select.Option value="仓房中央">仓房中央</Select.Option>
              <Select.Option value="仓门入口">仓门入口</Select.Option>
              <Select.Option value="通风口">通风口</Select.Option>
              <Select.Option value="粮面上部">粮面上部</Select.Option>
              <Select.Option value="粮堆内部">粮堆内部</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="gasConcentration"
            label="气体浓度 (mg/m³)"
            rules={[{ required: true, message: '请输入气体浓度' }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
          >
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setDetectionModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确认添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VentilationPage;
