
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';
import { applyDocumentBranding } from '../common/config/usisBranding';
import { UsisAppLoaderGate } from '../common/components/UsisAppLoaderGate';
import {
  ATTENDANCE_BASENAME,
  ATTENDANCE_DEFAULT_PATH,
  ATTENDANCE_LAST_PATH_KEY,
  resolveAttendancePath,
} from './utils/attendanceRoutePersistence';

function resolveAttendanceBasename(pathname: string): string {
  return pathname === ATTENDANCE_BASENAME || pathname.startsWith(`${ATTENDANCE_BASENAME}/`)
    ? ATTENDANCE_BASENAME
    : '';
}

function restoreAttendanceUrlOnBoot() {
  if (typeof window === 'undefined') return;

  const basename = resolveAttendanceBasename(window.location.pathname);
  if (!basename) return;

  const currentPath = window.location.pathname;
  if (currentPath !== basename && currentPath !== `${basename}/`) return;

  const savedPath = window.localStorage.getItem(ATTENDANCE_LAST_PATH_KEY) || ATTENDANCE_DEFAULT_PATH;
  const restoredPath = resolveAttendancePath(savedPath, ATTENDANCE_DEFAULT_PATH);
  const nextUrl = `${basename}${restoredPath}${window.location.search}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

applyDocumentBranding({ moduleTitle: 'Attendance Portal' });
restoreAttendanceUrlOnBoot();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <UsisAppLoaderGate label="Loading attendance subsystem">
      <BrowserRouter basename={resolveAttendanceBasename(window.location.pathname)}>
        <App />
      </BrowserRouter>
    </UsisAppLoaderGate>
  </React.StrictMode>
);
