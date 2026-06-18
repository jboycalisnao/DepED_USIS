import React from 'react';
import { UsisProfileTrigger } from './UsisProfileTrigger';

type UsisBreadcrumbBarProps = {
  rootLabel: string;
  currentLabel: string;
  profileName?: string | null;
  profileRole?: string | null;
  profileSubtitle?: string | null;
  onLogout?: () => void;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
};

export function UsisBreadcrumbBar({
  rootLabel,
  currentLabel,
  profileName,
  profileRole,
  profileSubtitle,
  onLogout,
  leftActions,
  rightActions,
}: UsisBreadcrumbBarProps) {
  return (
    <section className="usis-breadcrumb-bar" aria-label="Current subsystem page">
      <div className="usis-breadcrumb-bar__row">
        <div className="usis-breadcrumb-bar__left-group">
          {leftActions ? <div className="usis-breadcrumb-bar__left-actions">{leftActions}</div> : null}
          <p className="usis-breadcrumb">
            <span className="usis-breadcrumb__root">{rootLabel}</span>
            <span className="usis-breadcrumb__sep" aria-hidden="true">
              /
            </span>
            <span className="usis-breadcrumb__current">{currentLabel}</span>
          </p>
        </div>
        <div className="usis-breadcrumb-bar__right-group">
          {rightActions ? <div className="usis-breadcrumb-bar__right-actions">{rightActions}</div> : null}
          {profileName && onLogout ? (
            <UsisProfileTrigger
              name={profileName}
              role={profileRole || 'School Coordinator'}
              subtitle={profileSubtitle || undefined}
              onLogout={onLogout}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
