import React from 'react';
import { UsisProfileTrigger } from './UsisProfileTrigger';

type UsisBreadcrumbBarProps = {
  rootLabel: string;
  currentLabel: string;
  profileName?: string | null;
  profileRole?: string | null;
  onLogout?: () => void;
};

export function UsisBreadcrumbBar({
  rootLabel,
  currentLabel,
  profileName,
  profileRole,
  onLogout,
}: UsisBreadcrumbBarProps) {
  return (
    <section className="usis-breadcrumb-bar" aria-label="Current subsystem page">
      <div className="usis-breadcrumb-bar__row">
        <p className="usis-breadcrumb">
          <span className="usis-breadcrumb__root">{rootLabel}</span>
          <span className="usis-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="usis-breadcrumb__current">{currentLabel}</span>
        </p>
        {profileName && onLogout ? (
          <UsisProfileTrigger
            name={profileName}
            role={profileRole || 'School Coordinator'}
            onLogout={onLogout}
          />
        ) : null}
      </div>
    </section>
  );
}

