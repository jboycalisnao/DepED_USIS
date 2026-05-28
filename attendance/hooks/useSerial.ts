
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
  const isAutoConnecting = useRef(false);
  const readLoopActive = useRef(false);
  const bufferRef = useRef('');
  const flushTimeoutRef = useRef<number | null>(null);

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

  const disconnect = useCallback(async (isHardwareLoss = false) => {
    try {
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
        try {
          await portRef.current.close().catch(() => {});
        } catch (e) {}
        portRef.current = null;
      }
      
      setStatus('disconnected');
      if (isHardwareLoss) {
        addLog(`Monitor ${index + 1} - Hardware Disconnected: Device link lost.`, 'error');
      } else {
        addLog(`Monitor ${index + 1} - Disconnected safely.`, 'info');
      }
    } catch (e) {
      console.error("Cleanup error:", e);
      setStatus('disconnected');
    }
  }, [addLog, flushBuffer, index]);

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

      const selectedPort =
        existingPort ||
        await (navigator as any).serial.requestPort({
          filters: SERIAL_PORT_FILTERS,
        });
      await selectedPort.open({ baudRate: options.baudRate });
      
      localStorage.setItem(baudRateKey, options.baudRate.toString());
      portRef.current = selectedPort;
      
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
  }, [addLog, startReading, disconnect, index, baudRateKey]);

  // Handle Auto-Reconnection on mount
  useEffect(() => {
    const tryAutoConnect = async () => {
      if (!('serial' in navigator) || isAutoConnecting.current) return;
      
      try {
        isAutoConnecting.current = true;
        const ports = await (navigator as any).serial.getPorts();
        
        // If we have authorized ports, try to reconnect to the one at our index
        if (ports.length > index) {
          const savedBaud = localStorage.getItem(baudRateKey);
          const baudRate = savedBaud ? parseInt(savedBaud) : 9600;
          
          await connect({ baudRate }, ports[index]);
        }
      } catch (e) {
        console.warn(`Auto-reconnection for monitor ${index + 1} failed:`, e);
      } finally {
        isAutoConnecting.current = false;
      }
    };

    tryAutoConnect();
  }, [index, baudRateKey, connect]);

  useEffect(() => {
    const handleDisconnect = (event: any) => {
      if (portRef.current && event.port === portRef.current) {
        disconnect(true);
      }
    };

    if ('serial' in navigator) {
      (navigator as any).serial.addEventListener('disconnect', handleDisconnect);
    }

    return () => {
      if ('serial' in navigator) {
        (navigator as any).serial.removeEventListener('disconnect', handleDisconnect);
      }
    };
  }, [disconnect]);

  return { status, logs, connect, disconnect: () => disconnect(false), write, error };
};
