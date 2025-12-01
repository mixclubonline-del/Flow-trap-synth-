/**
 * FLOW TRAP SYNTH - FLOW DAW INTEGRATION
 * 
 * Add these snippets to App.tsx to enable Flow connection
 */

// ========================================
// 1. ADD TO IMPORTS (top of App.tsx)
// ========================================
import flowConnect from './lib/flow-connect/integration';
import { useEffect } from 'react'; // if not already imported

// ========================================
// 2. ADD USEEFFECT IN APP COMPONENT
// ========================================
// Place this inside the App component, after synthEngine initialization

useEffect(() => {
  // Listen for audio export requests from Flow
  const unsubscribe = flowConnect.on('audio:request', async () => {
    console.log('📤 Flow DAW requesting audio export...');
    
    // TODO: Implement audio export functionality
    // You'll need to add a method to SynthEngine to export the current audio
    // For now, we'll send a notification
    flowConnect.updateStatus({
      message: 'Export functionality coming soon!',
      isProcessing: false
    });
  });

  // Update Flow with synth status when engine is ready
  if (isAudioActive && synthEngine.current) {
    flowConnect.updateStatus({
      message: 'Synth engine active and ready',
      isProcessing: false
    });
  }

  return () => {
    unsubscribe();
  };
}, [isAudioActive]);

// ========================================
// 3. ADD EXPORT BUTTON TO UI (Optional)
// ========================================
// Add this button somewhere in your UI (e.g., in Header component)

<button
  onClick={async () => {
    if (!synthEngine.current) {
      alert('Synth engine not active');
      return;
    }
    
    flowConnect.updateStatus({
      message: 'Rendering audio...',
      isProcessing: true,
      progress: 0
    });

    // TODO: Implement actual audio rendering
    // This is a placeholder - you'll need to add rendering to SynthEngine
    
    flowConnect.updateStatus({
      message: 'Ready',
      isProcessing: false,
      progress: 1
    });
    
    alert('Export to Flow - feature coming soon!');
  }}
  className="flow-export-btn"
>
  📤 Export to Flow
</button>

// ========================================
// 4. STYLING (add to your CSS/styles)
// ========================================
/*
.flow-export-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.flow-export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
*/

// ========================================
// THAT'S IT!
// ========================================
// Run both apps:
// 1. Terminal 1: cd Flow-DAW && npm run dev
// 2. Terminal 2: cd Flow-trap-synth && npm run dev
// 3. Open both in browser
// 4. They will auto-connect via BroadcastChannel
