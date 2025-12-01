// Expose flowConnect to window for debugging
import flowConnect from './integration';

// Make it available in console
(window as any).flowConnect = flowConnect;

console.log('✅ flowConnect exposed to window for debugging');
console.log('Test in console: flowConnect.isConnected()');

export default flowConnect;
