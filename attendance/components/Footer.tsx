import React from 'react';
import { ConnectionStatus } from '../types';
import { UsisGlobalFooter } from '../../common/footer/UsisGlobalFooter';

interface FooterProps {
  status: ConnectionStatus;
  baudRate: number;
  assignedCount: number;
  totalCount: number;
}

const Footer: React.FC<FooterProps> = ({ status, baudRate, assignedCount, totalCount }) => {
  void status;
  void baudRate;
  void assignedCount;
  void totalCount;
  return <UsisGlobalFooter />;
};

export default Footer;
