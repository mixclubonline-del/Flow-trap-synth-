/**
 * FLOW CONNECT INTEGRATION
 * Flow Trap Synth → Flow DAW Connection
 */

import FlowConnect from './FlowConnect';

// Initialize FlowConnect for this app
export const flowConnect = new FlowConnect({
  appId: 'flow-trap-synth',
  appName: 'Flow Trap Synth',
  version: '1.0.0',
  capabilities: ['synthesis', 'audio-processing'],
  debug: true,
  
  onConnected: () => {
    console.log('🎹 Flow Trap Synth connected to Flow DAW!');
  },
  
  onDisconnected: () => {
    console.log('❌ Flow Trap Synth disconnected from Flow DAW');
  },
  
  onError: (error) => {
    console.error('Flow Connect error:', error);
  }
});

// Auto-connect on load
flowConnect.connect().catch(err => {
  console.warn('Failed to connect to Flow DAW:', err);
});

// Export for use in App
export default flowConnect;
