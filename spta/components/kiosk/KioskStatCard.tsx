import React from 'react';
import { KioskStatItem, statCardStyles } from './kioskDisplayConfig';

interface KioskStatCardProps {
  item: KioskStatItem;
  index: number;
  className?: string;
}

export const KioskStatCard: React.FC<KioskStatCardProps> = ({ item, index, className = '' }) => {
  const palette = statCardStyles[index % statCardStyles.length];
  const shellClassName = 'rounded-xl px-5 py-4';
  const labelClassName = 'text-[16px] font-extrabold';
  const valueClassName = index === 0 || index === 1 ? 'text-7xl font-black leading-none' : 'text-6xl font-black leading-none';
  const helperClassName = 'text-[14px] font-semibold';

  return (
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden border shadow-sm ${shellClassName} ${palette.shell} ${className}`}>
      <div className={`absolute left-0 right-0 top-0 h-1 ${palette.accent}`} />
      <p className={`${labelClassName} ${palette.label} tracking-[0.01em]`}>{item.label}</p>
      <div className="flex flex-1 items-center justify-center">
        <p className={`text-center ${valueClassName} ${palette.value} drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]`}>{item.value}</p>
      </div>
      <p className={`${helperClassName} ${palette.helper} tracking-[0.01em]`}>{item.helper}</p>
    </div>
  );
};
