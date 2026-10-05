/** Editable story, identity, palette, and fixed frame boundaries for the 29-second master. */
export const film = {
  fps: 30, frames: 870, width: 1920, height: 1080,
  cuts: [0, 120, 210, 360, 570, 720, 870],
  trace: '8f3c2a917b644e0db125a6c09f72e431',
  traceDisplay: '8f3c2a91…9f72e431',
  order: 'ORD-DEMO-1042', transaction: 'TXN-DEMO-2086',
  brand: 'AYN AL-SIJILL', team: 'Saud • Retaj • Norah • Lama',
  headlines: ['Payment approved.', 'One checkout. One trace.', 'Connected evidence. On Azure.', 'The cause is in the trace.', 'Alert with context. Keep the evidence.'],
  events: [
    {label: 'CHECKOUT_STARTED', source: 'checkout-service'},
    {label: 'INVENTORY_RESERVED', source: 'inventory-service'},
    {label: 'PAYMENT_SUCCESS', source: 'payment-service'},
    {label: 'ORDER_CREATE_FAILED', source: 'order-service'},
    {label: 'DATABASE_TIMEOUT', source: 'postgresql'},
    {label: 'HTTP_REQUEST_COMPLETED', source: 'HTTP 500'},
  ],
  colors: {
    bg: '#092B21', deep: '#061F19', surface: '#123E2F', raised: '#1D4B39',
    line: '#416851', ivory: '#F7FCF4', mint: '#B4DCC0', muted: '#AAC5B4',
    coral: '#F4AA94', blue: '#88C8F2', pale: '#D4EAD7', ink: '#103624',
  },
} as const;
