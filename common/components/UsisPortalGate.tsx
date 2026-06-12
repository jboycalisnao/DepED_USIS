import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@deped-usis/shared-supabase';

type PortalStatusMode = 'live' | 'maintenance' | 'soon_open';

interface PortalGateConfig {
  is_enabled: boolean;
  mode: PortalStatusMode;
  title_text: string;
  body_text: string;
  icon_name: string;
}

interface UsisPortalGateProps {
  moduleKey: string;
}

export function UsisPortalGate({ moduleKey }: UsisPortalGateProps) {
  const [config, setConfig] = useState<PortalGateConfig | null>(null);
  const allowPortalGateBypass = import.meta.env.VITE_ALLOW_PORTAL_GATE_BYPASS === 'true';
  const iconName = String(config?.icon_name || 'construction').trim() || 'construction';

  useEffect(() => {
    if (allowPortalGateBypass) {
      setConfig(null);
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('ia_portal_controls')
          .select('is_enabled,mode,title_text,body_text,icon_name')
          .eq('module_key', moduleKey)
          .limit(1)
          .maybeSingle();

        if (error || !isMounted || !data) return;
        setConfig(data as PortalGateConfig);
      } catch {
        // Fail-open: do not block access if config cannot be loaded.
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [allowPortalGateBypass, moduleKey]);

  const shouldBlock = useMemo(
    () => !allowPortalGateBypass && Boolean(config && (!config.is_enabled || config.mode !== 'live')),
    [allowPortalGateBypass, config],
  );

  if (!shouldBlock || !config) return null;

  return (
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" />
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-label="Portal status notice">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Portal Status</p>
            <h3>{config.title_text}</h3>
          </div>
        </div>
        <div className="modal-dialog__body">
          <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined usis-portal-gate__icon" aria-hidden="true">
              {iconName}
            </span>
            <p>{config.body_text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
