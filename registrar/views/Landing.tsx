
import React, { useState } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Checkbox, 
  Card, 
  Typography, 
  ConfigProvider, 
  App as AntApp,
  theme 
} from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useStore } from '../store';

const { Title, Text } = Typography;

const LandingContent: React.FC = () => {
  const { login } = useStore();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const onFinish = (values: any) => {
    setLoading(true);
    // Add artificial delay for high-end feel
    setTimeout(() => {
      const success = login(values.username, values.password);
      if (success) {
        message.success('Access granted. Synchronizing systems...');
      } else {
        message.error('Authentication failed. Please verify credentials.');
        setLoading(false);
      }
    }, 800);
  };

  const schoolSeal = "https://ik.imagekit.io/astrasolutions/Leon%20NHS/leon%20nhs%20marks%20-%20upscaled/Leon%20NHS%20-%20Seal(Blue).png?updatedAt=1769134600365";
  const depedLogo = "https://ik.imagekit.io/astrasolutions/Leon%20NHS/leon%20nhs%20marks%20-%20upscaled/Leon%20NHS%20-%20Seal(Blue).png?updatedAt=1769134600365";

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-primary/20">
      {/* Subtle Institutional Background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `url(${schoolSeal})`, backgroundSize: '400px', backgroundRepeat: 'repeat' }}>
      </div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-700">
        {/* Top Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <img src={depedLogo} alt="DepEd Logo" className="h-10 w-auto mb-3 grayscale opacity-70" />
          <Text strong className="text-[10px] uppercase tracking-[0.2em] text-outline opacity-60">
            Republic of the Philippines
          </Text>
        </div>

        <Card 
          className="shadow-ant-shadow border-none rounded-[16px] overflow-hidden"
          styles={{ body: { padding: '48px 40px' } }}
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center p-2 mb-6 border border-gray-100">
              <img src={schoolSeal} alt="Leon NHS Seal" className="w-full h-full object-contain" />
            </div>
            
            <Title level={3} className="!m-0 !text-primary !font-black !uppercase !tracking-tight">
              Leon NHS
            </Title>
            <Text strong className="text-[11px] text-accent uppercase tracking-[0.2em] mt-1">
              Registrar's Portal
            </Text>
          </div>

          <Form
            name="login_form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Identification is required' }]}
            >
              <Input 
                prefix={<UserOutlined className="text-gray-400" />} 
                placeholder="User Identification" 
                className="rounded-lg py-3"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Access key is required' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="Access Key"
                className="rounded-lg py-3"
              />
            </Form.Item>

            <div className="flex items-center justify-between mb-8 px-1">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="text-[11px] font-bold uppercase tracking-tight text-gray-500">
                  Stay Active
                </Checkbox>
              </Form.Item>
              <Button type="link" className="!p-0 !h-auto text-[11px] font-black uppercase tracking-tight text-outline">
                Recovery
              </Button>
            </div>

            <Form.Item className="mb-0">
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                className="h-14 rounded-lg bg-primary hover:!bg-primary/90 flex items-center justify-center gap-2"
              >
                {!loading && <SafetyCertificateOutlined className="text-lg" />}
                SECURE ACCESS
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-12 text-center opacity-40">
            <Text className="text-[9px] font-black uppercase tracking-widest block">
              System Cycle 2025.0
            </Text>
            <Text className="text-[8px] font-bold uppercase tracking-[0.2em] block mt-1">
              Institutional Master Registry
            </Text>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <Text className="text-[10px] font-bold text-outline opacity-40 uppercase tracking-[0.4em]">
            Leon National High School
          </Text>
        </div>
      </div>
    </div>
  );
};

const Landing: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#004E8C',
          borderRadius: 8,
          fontFamily: 'Roboto, sans-serif',
          colorBgContainer: '#ffffff',
          colorTextHeading: '#004E8C',
          colorLink: '#004E8C',
        },
        components: {
          Input: {
            activeShadow: '0 0 0 2px rgba(0, 78, 140, 0.1)',
          },
          Button: {
            controlHeightLG: 56,
            fontWeight: 700,
          }
        }
      }}
    >
      <AntApp>
        <LandingContent />
      </AntApp>
    </ConfigProvider>
  );
};

export default Landing;
