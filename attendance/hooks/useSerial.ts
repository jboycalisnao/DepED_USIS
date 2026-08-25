
import { useState, useCallback, useRef, useEffect } from 'react';
import { SerialLog, ConnectionStatus, SerialOptions } from '../types';

// Limit chooser to common USB serial chipsets used by school RFID/Arduino devices.
// This avoids Bluetooth serial profile noise from Chrome's blocklist warnings.
const SERIAL_PORT_FILTERS = [
  { usbVendorId: 0x2341 }, // Arduino
  { usbVendorId: 0x1a86 }, // QinHeng (CH340/CH341)
  { usbVendorId: 0x10c4 }, // Silicon Labs (CP210x)
  { usbVendorId: 0x0403 }, // FTDI
  { usbVendorId: 0x2a03 }, // Arduino (legacy/alt VID)
];

export const useSerial = (index: number = 0) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [logs, setLogs] = useState<SerialLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const portRef = useRef<any>(null);
  const lastPortRef = useRef<any>(null);
  const isAutoConnecting = useRef(false);
  const readLoopActive = useRef(false);
  const shouldReconnectRef = useRef(false);
  const bufferRef = useRef('');
  const flushTimeoutRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectWaitingLoggedRef = useRef(false);

  const baudRateKey = `last_baud_rate_${index}`;

  const addLog = useCallback((text: string, type: SerialLog['type']) => {
    const newLog: SerialLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      text
    };
    setLogs(prev => [...prev.slice(-499), newLog]);
  }, []);

  const write = useCallback(async (text: string) => {
    if (!writerRef.current) {
      console.warn(`Monitor ${index + 1} - No writer available.`);
      return;
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text.endsWith('\n') ? text : text + '\n');
      await writerRef.current.write(data);
      addLog(text.trim(), 'out');
    } catch (err: any) {
      console.error(`Monitor ${index + 1} - Write error:`, err);
      addLog(`Write Error: ${err.message}`, 'error');
    }
  }, [addLog, index]);

  const flushBuffer = useCallback(() => {
    if (bufferRef.current.trim()) {
      addLog(bufferRef.current.trim(), 'in');
      bufferRef.current = '';
    }
    if (flushTimeoutRef.current) {
      window.clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
  }, [addLog]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(async (isHardwareLoss = false) => {
    try {
      if (!isHardwareLoss) {
        shouldReconnectRef.current = false;
        clearReconnectTimer();
      }

      flushBuffer();
      
      if (readerRef.current) {
        await readerRef.current.cancel().catch(() => {});
        readerRef.current = null;
      }

      if (writerRef.current) {
        await writerRef.current.releaseLock();
        writerRef.current = null;
      }

      let timeout = 0;
      while (readLoopActive.current && timeout < 20) {
        await new Promise(r => setTimeout(r, 50));
        timeout++;
      }

      if (portRef.current) {
        lastPortRef.current = portRef.current;
        try {
          await portRef.current.close().catch(() => {});
        } catch (e) {}
        portRef.current = null;
      }
      
      setStatus('disconnected');
      if (isHardwareLoss) {
        shouldReconnectRef.current = true;
        addLog(`Monitor ${index + 1} - Hardware Disconnected: Device link lost.`, 'error');
      } else {
        addLog(`Monitor ${index + 1} - Disconnected safely.`, 'info');
      }
    } catch (e) {
      console.error("Cleanup error:", e);
      setStatus('disconnected');
    }
  }, [addLog, clearReconnectTimer, flushBuffer, index]);

  const startReading = useCallback(async (selectedPort: any) => {
    if (!selectedPort || !selectedPort.readable) return;
    
    readLoopActive.current = true;
    const reader = selectedPort.readable.getReader();
    readerRef.current = reader;

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        if (value) {
          bufferRef.current += decoder.decode(value, { stream: true });
          
          if (flushTimeoutRef.current) window.clearTimeout(flushTimeoutRef.current);

          if (bufferRef.current.includes('\n') || bufferRef.current.includes('\r')) {
            const lines = bufferRef.current.split(/\r?\n|\r/);
            bufferRef.current = lines.pop() || ''; 
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                addLog(trimmed, 'in');
              }
            }
          }
          
          flushTimeoutRef.current = window.setTimeout(() => {
            flushBuffer();
          }, 200);
        }
      }
    } catch (err: any) {
      if (err.name === 'NetworkError' || err.message?.toLowerCase().includes('device has been lost')) {
        disconnect(true);
      } else if (err.name !== 'AbortError') {
        addLog(`Serial Error: ${err.message}`, 'error');
      }
    } finally {
      try {
        if (reader) {
          reader.releaseLock();
        }
      } catch (e) {}
      readerRef.current = null;
      readLoopActive.current = false;
    }
  }, [addLog, flushBuffer, disconnect]);

  const connect = useCallback(async (options: SerialOptions, existingPort?: any) => {
    if (!('serial' in navigator)) {
      setError('Web Serial API is not supported.');
      return;
    }

    try {
      // Prevent overlapping connection attempts
      if (portRef.current) await disconnect();

      setError(null);
      setStatus('connecting');

      const isKioskShell = Boolean((window as any).usisKioskShell);
      const selectedPort =
        existingPort ||
        await (navigator as any).serial.requestPort(
          isKioskShell
            ? undefined
            : { filters: SERIAL_PORT_FILTERS },
        );
      await selectedPort.open({ baudRate: options.baudRate });
      
      localStorage.setItem(baudRateKey, options.baudRate.toString());
      portRef.current = selectedPort;
      lastPortRef.current = selectedPort;
      shouldReconnectRef.current = true;
      reconnectWaitingLoggedRef.current = false;
      clearReconnectTimer();
      
      if (selectedPort.writable) {
        writerRef.current = selectedPort.writable.getWriter();
      }

      setStatus('connected');
      addLog(`Monitor ${index + 1} Online: ${options.baudRate} baud.`, 'info');
      
      startReading(selectedPort);
    } catch (err: any) {
      // Ignore user cancellation
      if (err.name === 'NotFoundError') {
        setStatus('disconnected');
        return;
      }
      setError(err.message || 'Connection failed.');
      setStatus('disconnected');
    }
  }, [addLog, clearReconnectTimer, startReading, disconnect, index, baudRateKey]);

  const reconnectToLastPort = useCallback(async (port?: any) => {
    if (!('serial' in navigator) || isAutoConnecting.current || portRef.current || !shouldReconnectRef.current) return;

    try {
      isAutoConnecting.current = true;
      const ports = await (navigator as any).serial.getPorts();
      const rememberedPort = lastPortRef.current && ports.includes(lastPortRef.current) ? lastPortRef.current : null;
      const savedPort = port || rememberedPort || ports[index];
      if (!savedPort) return;
      if (!port && !ports.includes(savedPort)) return;

      const savedBaud = localStorage.getItem(baudRateKey);
      const baudRate = savedBaud ? parseInt(savedBaud) : 9600;
      await connect({ baudRate }, savedPort);
    } catch (e) {
      console.warn(`Auto-reconnection for monitor ${index + 1} failed:`, e);
    } finally {
      isAutoConnecting.current = false;
    }
  }, [baudRateKey, connect, index]);

  const scheduleReconnectToLastPort = useCallback(() => {
    if (!shouldReconnectRef.current) return;
    clearReconnectTimer();
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      void reconnectToLastPort().finally(() => {
        if (!portRef.current && shouldReconnectRef.current) {
          scheduleReconnectToLastPort();
        }
      });
    }, 2000);
  }, [clearReconnectTimer, reconnectToLastPort]);

  useEffect(() => {
    if (status === 'disconnected' && shouldReconnectRef.current) {
      scheduleReconnectToLastPort();
    }
  }, [scheduleReconnectToLastPort, status]);

  // Handle Auto-Reconnection on mount
  useEffect(() => {
    const tryAutoConnect = async () => {
      if (!('serial' in navigator) || isAutoConnecting.current) return;
      
      try {
        const ports = await (navigator as any).serial.getPorts();
        if (ports.length > index) {
          shouldReconnectRef.current = true;
          lastPortRef.current = ports[index];
          await reconnectToLastPort(ports[index]);
        }
      } catch (e) {
        console.warn(`Auto-reconnection for monitor ${index + 1} failed:`, e);
      }
    };

    tryAutoConnect();
  }, [index, reconnectToLastPort]);

  useEffect(() => {
    const handleDisconnect = (event: any) => {
      if (portRef.current && event.port === portRef.current) {
        if (!reconnectWaitingLoggedRef.current) {
          reconnectWaitingLoggedRef.current = true;
          addLog(`Monitor ${index + 1} - Waiting for serial device to reconnect.`, 'info');
        }
        void disconnect(true).finally(() => {
          scheduleReconnectToLastPort();
        });
      }
    };

    const handleConnect = (event: any) => {
      window.setTimeout(async () => {
        if (!shouldReconnectRef.current || portRef.current) return;

        const ports = await (navigator as any).serial.getPorts().catch(() => []);
        const eventPortIndex = ports.indexOf(event.port);
        const isKnownPort = event.port === lastPortRef.current;
        const isMonitorSlotPort = eventPortIndex === index;
        const isUnclaimedMonitorPort = !lastPortRef.current && eventPortIndex === index;

        if (isKnownPort || isMonitorSlotPort || isUnclaimedMonitorPort) {
          lastPortRef.current = event.port;
          void reconnectToLastPort(event.port);
        }
      }, 300);
    };

    if ('serial' in navigator) {
      (navigator as any).serial.addEventListener('disconnect', handleDisconnect);
      (navigator as any).serial.addEventListener('connect', handleConnect);
    }

    return () => {
      if ('serial' in navigator) {
        (navigator as any).serial.removeEventListener('disconnect', handleDisconnect);
        (navigator as any).serial.removeEventListener('connect', handleConnect);
      }
      clearReconnectTimer();
    };
  }, [clearReconnectTimer, disconnect, reconnectToLastPort, scheduleReconnectToLastPort]);

  return { status, logs, connect, disconnect: () => disconnect(false), write, error };
};
