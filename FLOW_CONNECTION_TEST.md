# Flow Connect Test Plan

## ✅ Setup Complete

### Flow Trap Synth
- ✅ FlowConnect SDK copied
- ✅ Integration file created
- ✅ Import added to App.tsx
- ✅ Dependencies installed

### Flow DAW
- 🔲 Needs FlowConnectReceiver hook added
- 🔲 Needs dev server started

## 🧪 Testing Steps

### Step 1: Start Flow DAW
```bash
cd /Users/mixxclub/Projects/Mix-club-final-DAW-prototype-for-fusion
npm run dev
```

### Step 2: Add Receiver to Flow DAW

Add to `App.tsx` imports:
```typescript
import { useFlowConnectReceiver } from './hooks/useFlowConnectReceiver';
```

Add inside App component:
```typescript
// Flow Connect - Listen for external apps
const { connectedApps } = useFlowConnectReceiver();

useEffect(() => {
  console.log('📱 Connected Apps:', connectedApps);
}, [connectedApps]);
```

### Step 3: Start Flow Trap Synth
```bash
cd /Users/mixxclub/Projects/Flow-trap-synth
npm run dev
```

### Step 4: Open Both Apps
- Flow DAW: http://localhost:3001
- Flow Trap Synth: http://localhost:5173 (or whatever port Vite assigns)

### Step 5: Verify Connection

**In Flow Trap Synth console:**
```javascript
flowConnect.isConnected()  // Should return true
```

**In Flow DAW console:**
```javascript
window.__flowPlugins  // Should show Flow Trap Synth
```

**Expected console output:**
```
[FlowConnect:Flow Trap Synth] FlowConnect SDK initialized
[FlowConnect:Flow Trap Synth] 🔗 Connected to Flow
[FlowConnect:Flow Trap Synth] 📤 Sent: { type: 'app:register', ... }

// In Flow DAW:
✅ App connected: Flow Trap Synth (flow-trap-synth)
```

## 🎯 Success Criteria

- [ ] Flow Trap Synth connects automatically
- [ ] Flow DAW shows connected app in console
- [ ] Both apps can exchange messages
- [ ] No errors in console

## 🐛 Troubleshooting

**If connection fails:**
1. Check both apps are running
2. Check both are using same browser (BroadcastChannel must be same browser)
3. Check console for errors
4. Verify SDK import in both apps

**If port conflicts:**
- Flow DAW should be on 3001
- Flow Trap Synth will auto-assign (usually 5173)
- Make sure no other services using these ports
