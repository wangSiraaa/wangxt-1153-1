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
  List,
  Checkbox,
  Divider,
  Statistic,
  Row,
  Col,
  Select
} from 'antd';
import { 
  MedicineBoxOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  UserAddOutlined,
  CheckSquareOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { fumigationPlanApi, dosingRecordApi } from '../api';
import type { FumigationPlan, DosingRecord, FumigationStatus } from '../types';
import { statusMap } from '../types';
import dayjs from 'dayjs';

const DosingPage: React.FC = () => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [plans, setPlans] = useState<FumigationPlan[]>([]);
  const [dosingRecords, setDosingRecords] = useState<DosingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [evacuationModalVisible, setEvacuationModalVisible] = useState(false);
  const [personnelModalVisible, setPersonnelModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<FumigationPlan | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DosingRecord | null>(null);
  const [form] = Form.useForm();
  const [evacuationForm] = Form.useForm();
  const [personnelForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, recordsRes] = await Promise.all([
        fumigationPlanApi.getList({ pageSize: 100 }),
        dosingRecordApi.getList()
      ]);
      
      if (plansRes.success && plansRes.data) {
        const dosingRelatedPlans = plansRes.data.filter(p => 
          ['guard_confirmed', 'dosing_pending', 'evacuation_pending', 'dosing_completed', 'fumigating'].includes(p.status)
        );
        setPlans(dosingRelatedPlans);
      }
      
      if (recordsRes.success && recordsRes.data) {
        setDosingRecords(recordsRes.data);
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

  const getDosingRecord = (planId: string) => {
    return dosingRecords.find(r => r.fumigationPlanId === planId);
  };

  const handleCreate = async (plan: FumigationPlan) => {
    try {
      const res = await dosingRecordApi.create({
        fumigationPlanId: plan._id,
        planNo: plan.planNo,
        warehouseId: plan.warehouseId,
        warehouseCode: plan.warehouseCode,
        chemicalId: plan.chemicalId,
        chemicalName: plan.chemicalName,
        personnelList: [],
        evacuationCheck: [],
        actualDosage: plan.chemicalDosage,
        constructionLeader: 'user003',
        constructionLeaderName: '王五（施工负责人）'
      });
      
      if (res.success) {
        message.success('投药记录已创建');
        setSelectedPlan(plan);
        setSelectedRecord(res.data as DosingRecord);
        loadData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '创建失败');
    }
  };

  const handleOpenRecord = (plan: FumigationPlan) => {
    const record = getDosingRecord(plan._id);
    if (record) {
      setSelectedPlan(plan);
      setSelectedRecord(record);
      form.setFieldsValue({
        dosingMethod: record.dosingMethod,
        dosingPoints: record.dosingPoints,
        actualDosage: record.actualDosage,
        dosingRemarks: record.dosingRemarks
      });
      setRecordModalVisible(true);
    }
  };

  const handleSaveRecord = async (values: any) => {
    if (!selectedRecord) return;
    
    try {
      await dosingRecordApi.update(selectedRecord._id, values);
      message.success('投药记录已保存');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '保存失败');
    }
  };

  const handleAddPersonnel = async (values: any) => {
    if (!selectedRecord) return;
    
    try {
      await dosingRecordApi.addPersonnel(selectedRecord._id, values);
      message.success('人员添加成功');
      personnelForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加失败');
    }
  };

  const handleAddEvacuationCheck = async (values: any) => {
    if (!selectedRecord) return;
    
    try {
      await dosingRecordApi.addEvacuationCheck(selectedRecord._id, {
        ...values,
        checked: true,
        checker: 'user003',
        checkTime: new Date().toISOString()
      });
      message.success('检查记录已添加');
      evacuationForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加失败');
    }
  };

  const handleConfirmEvacuation = async () => {
    if (!selectedRecord) return;
    
    modal.confirm({
      title: '确认人员撤离',
      content: (
        <div>
          <p>请确认以下事项：</p>
          <ul style={{ marginLeft: 20 }}>
            <li>所有作业人员已登记并撤离</li>
            <li>所有区域已检查完毕</li>
            <li>仓内无人员滞留</li>
          </ul>
          <p className="warning-text">确认后才能开始投药！</p>
        </div>
      ),
      okText: '确认撤离',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await dosingRecordApi.confirmEvacuation(selectedRecord._id, {
            operator: 'user003',
            operatorName: '王五（施工负责人）'
          });
          message.success('人员撤离已确认，可以开始投药');
          setEvacuationModalVisible(false);
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || '确认失败');
        }
      }
    });
  };

  const handleStartDosing = async () => {
    if (!selectedRecord) return;
    
    try {
      await dosingRecordApi.startDosing(selectedRecord._id);
      message.success('投药已开始');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '开始投药失败');
    }
  };

  const handleCompleteDosing = async () => {
    if (!selectedRecord) return;
    
    modal.confirm({
      title: '确认完成投药',
      content: '请确认投药作业已完成，所有投药点已按要求投放药剂。',
      onOk: async () => {
        try {
          await dosingRecordApi.completeDosing(selectedRecord._id, {
            operator: 'user003',
            operatorName: '王五（施工负责人）'
          });
          message.success('投药作业已完成，进入熏蒸密闭阶段');
          setRecordModalVisible(false);
          loadData();
        } catch (error: any) {
          message.error(error.response?.data?.message || '完成失败');
        }
      }
    });
  };

  const checkAreas = [
    '仓房内部', '仓门入口', '通风口', '投药点周围', '值班室', '设备间'
  ];

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
      title: '药剂/用量',
      key: 'chemical',
      width: 160,
      render: (_, record) => (
        <div>
          <div>{record.chemicalName}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{record.chemicalDosage} kg</div>
        </div>
      )
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
      title: '施工负责人',
      key: 'leader',
      width: 120,
      render: (_, record) => {
        const dr = getDosingRecord(record._id);
        return dr?.constructionLeaderName || record.constructionLeaderName || '-';
      }
    },
    {
      title: '作业人员',
      key: 'personnel',
      width: 100,
      render: (_, record) => {
        const dr = getDosingRecord(record._id);
        return dr ? `${dr.personnelList.length} 人` : '-';
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right',
      render: (_, record) => {
        const dr = getDosingRecord(record._id);
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
            {record.status === 'guard_confirmed' && !dr && (
              <Button
                type="primary"
                size="small"
                icon={<MedicineBoxOutlined />}
                onClick={() => handleCreate(record)}
              >
                创建投药记录
              </Button>
            )}
            {dr && ['dosing_pending', 'evacuation_pending', 'dosing_completed'].includes(record.status) && (
              <Button
                type="primary"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleOpenRecord(record)}
              >
                投药作业
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  const pendingPersonnel = plans.filter(p => {
    const dr = getDosingRecord(p._id);
    return p.status === 'dosing_pending' && dr?.personnelList.length === 0;
  }).length;
  const pendingEvacuation = plans.filter(p => p.status === 'evacuation_pending').length;
  const dosingCount = plans.filter(p => p.status === 'dosing_completed' || p.status === 'fumigating').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>投药作业管理</h2>
        <p style={{ color: '#666', marginTop: 4 }}>施工负责人登记人员、记录投药和撤离</p>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card warning">
            <div style={{ fontSize: 28, marginBottom: 4 }}><UserAddOutlined /></div>
            <div className="stat-value">{pendingPersonnel}</div>
            <div className="stat-label">待登记人员</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card info">
            <div style={{ fontSize: 28, marginBottom: 4 }}><CheckSquareOutlined /></div>
            <div className="stat-value">{pendingEvacuation}</div>
            <div className="stat-label">待确认撤离</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card success">
            <div style={{ fontSize: 28, marginBottom: 4 }}><MedicineBoxOutlined /></div>
            <div className="stat-value">{dosingCount}</div>
            <div className="stat-label">已完成投药</div>
          </Card>
        </Col>
      </Row>

      <Alert
        message="安全规则"
        description={
          <div>
            <p><strong>人员未撤离不能投药</strong> - 必须登记所有作业人员，确认全部撤离，检查所有区域后才能开始投药。</p>
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
        title="投药作业管理"
        open={recordModalVisible}
        onCancel={() => setRecordModalVisible(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {selectedPlan && selectedRecord && (
          <>
            <Descriptions size="small" bordered column={3} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="计划编号">{selectedPlan.planNo}</Descriptions.Item>
              <Descriptions.Item label="仓房">{selectedPlan.warehouseName}</Descriptions.Item>
              <Descriptions.Item label="药剂">{selectedRecord.chemicalName}</Descriptions.Item>
              <Descriptions.Item label="计划用量">{selectedPlan.chemicalDosage} kg</Descriptions.Item>
              <Descriptions.Item label="实际用量">{selectedRecord.actualDosage} kg</Descriptions.Item>
              <Descriptions.Item label="施工负责人">{selectedRecord.constructionLeaderName}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">作业人员登记</Divider>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold' }}>
                  已登记 {selectedRecord.personnelList.length} 人
                </span>
                {!selectedRecord.evacuationCompleted && (
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<UserAddOutlined />}
                    onClick={() => setPersonnelModalVisible(true)}
                  >
                    添加人员
                  </Button>
                )}
              </div>
              {selectedRecord.personnelList.length > 0 ? (
                <List
                  size="small"
                  bordered
                  dataSource={selectedRecord.personnelList}
                  renderItem={(item, idx) => (
                    <List.Item key={idx}>
                      <List.Item.Meta
                        title={item.name}
                        description={`${item.role} | ${item.contact}`}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Alert type="info" message="请先登记作业人员名单" showIcon />
              )}
            </div>

            <Divider orientation="left">撤离区域检查</Divider>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 'bold' }}>
                  已检查 {selectedRecord.evacuationCheck.filter(c => c.checked).length} / {checkAreas.length} 个区域
                </span>
                {!selectedRecord.evacuationCompleted && (
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<CheckSquareOutlined />}
                    onClick={() => setEvacuationModalVisible(true)}
                  >
                    检查区域
                  </Button>
                )}
              </div>
              <div>
                {checkAreas.map((area, idx) => {
                  const checked = selectedRecord.evacuationCheck.find(c => c.area === area && c.checked);
                  return (
                    <div key={idx} style={{ marginBottom: 4 }}>
                      <Checkbox checked={!!checked} disabled>
                        {area}
                        {checked && (
                          <span style={{ marginLeft: 8, color: '#52c41a', fontSize: 12 }}>
                            {dayjs(checked.checkTime).format('HH:mm')} 由 {checked.checker} 检查
                          </span>
                        )}
                      </Checkbox>
                    </div>
                  );
                })}
              </div>
            </div>

            <Divider orientation="left">投药信息</Divider>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveRecord}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="actualDosage"
                    label="实际用药量 (kg)"
                    rules={[{ required: true, message: '请输入实际用药量' }]}
                  >
                    <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="dosingPoints"
                    label="投药点数"
                    rules={[{ required: true, message: '请输入投药点数' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="dosingMethod"
                    label="投药方式"
                    rules={[{ required: true, message: '请选择投药方式' }]}
                  >
                    <Select placeholder="请选择">
                      <Select.Option value="粮面施药">粮面施药</Select.Option>
                      <Select.Option value="探管施药">探管施药</Select.Option>
                      <Select.Option value="仓内缓释">仓内缓释</Select.Option>
                      <Select.Option value="环流熏蒸">环流熏蒸</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="dosingRemarks"
                label="投药备注"
              >
                <Input.TextArea rows={2} placeholder="请输入投药备注" />
              </Form.Item>

              {!selectedRecord.dosingEndTime && (
                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Space>
                    <Button htmlType="submit">保存记录</Button>
                    {selectedRecord.evacuationCompleted && !selectedRecord.dosingStartTime && (
                      <Button 
                        type="primary" 
                        icon={<PlayCircleOutlined />}
                        onClick={handleStartDosing}
                      >
                        开始投药
                      </Button>
                    )}
                    {selectedRecord.dosingStartTime && !selectedRecord.dosingEndTime && (
                      <Button 
                        type="primary" 
                        danger
                        icon={<CheckCircleOutlined />}
                        onClick={handleCompleteDosing}
                      >
                        完成投药
                      </Button>
                    )}
                    {!selectedRecord.evacuationCompleted && selectedRecord.personnelList.length > 0 && 
                     selectedRecord.evacuationCheck.filter(c => c.checked).length === checkAreas.length && (
                      <Button 
                        type="primary" 
                        danger
                        icon={<CheckCircleOutlined />}
                        onClick={handleConfirmEvacuation}
                      >
                        确认人员撤离
                      </Button>
                    )}
                  </Space>
                </Form.Item>
              )}
            </Form>

            {selectedRecord.dosingEndTime && (
              <Alert
                message="投药已完成"
                description={`投药于 ${dayjs(selectedRecord.dosingEndTime).format('YYYY-MM-DD HH:mm')} 完成，已进入熏蒸密闭阶段。`}
                type="success"
                showIcon
              />
            )}
          </>
        )}
      </Modal>

      <Modal
        title="添加作业人员"
        open={personnelModalVisible}
        onCancel={() => setPersonnelModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={personnelForm}
          layout="vertical"
          onFinish={handleAddPersonnel}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Select.Option value="投药员">投药员</Select.Option>
              <Select.Option value="安全员">安全员</Select.Option>
              <Select.Option value="记录员">记录员</Select.Option>
              <Select.Option value="协助人员">协助人员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="idCard"
            label="身份证号"
            rules={[{ required: true, message: '请输入身份证号' }]}
          >
            <Input placeholder="请输入身份证号" />
          </Form.Item>
          <Form.Item
            name="contact"
            label="联系电话"
            rules={[{ required: true, message: '请输入联系电话' }]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setPersonnelModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="撤离区域检查"
        open={evacuationModalVisible}
        onCancel={() => setEvacuationModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={evacuationForm}
          layout="vertical"
          onFinish={handleAddEvacuationCheck}
        >
          <Form.Item
            name="area"
            label="检查区域"
            rules={[{ required: true, message: '请选择检查区域' }]}
          >
            <Select placeholder="请选择检查区域">
              {checkAreas.map((area, idx) => (
                <Select.Option key={idx} value={area}>{area}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEvacuationModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">确认检查</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DosingPage;
