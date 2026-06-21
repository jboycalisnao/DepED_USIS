type EnrollmentBandwidthLogInput = {
  action: string;
  request?: unknown;
  response?: unknown;
  meta?: Record<string, unknown>;
};

const estimateJsonBytes = (value: unknown) => {
  try {
    const json = JSON.stringify(value ?? null);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(json).length;
    }
    return json.length;
  } catch {
    return null;
  }
};

export const logEnrollmentBandwidthEstimate = ({ action, request, response, meta }: EnrollmentBandwidthLogInput) => {
  const requestBytes = estimateJsonBytes(request);
  const responseBytes = estimateJsonBytes(response);
  const totalBytes =
    (typeof requestBytes === 'number' ? requestBytes : 0) +
    (typeof responseBytes === 'number' ? responseBytes : 0);

  console.info('[EnrollmentBandwidth] ' + action, {
    ...meta,
    approxEgressBytes: requestBytes,
    approxIngressBytes: responseBytes,
    approxTotalBytes: totalBytes,
  });
};
