/**
 * FLOW CONNECT SDK
 * 
 * Lightweight SDK for connecting external production apps to Flow DAW.
 * Drop this into any application to enable Flow integration.
 * 
 * @module flow-connect-sdk
 * @version 1.0.0
 */

export interface FlowConnectConfig {
    /** Your app's unique identifier */
    appId: string;

    /** Display name of your app */
    appName: string;

    /** App version */
    version: string;

    /** Flow instance URL (default: http://localhost:3001 for dev) */
    flowUrl?: string;

    /** Enable debug logging */
    debug?: boolean;

    /** Capabilities your app provides */
    capabilities?: AppCapability[];

    /** Event handlers */
    onConnected?: () => void;
    onDisconnected?: () => void;
    onError?: (error: Error) => void;
}

export type AppCapability =
    | 'audio-processing'
    | 'stem-separation'
    | 'mastering'
    | 'mixing'
    | 'synthesis'
    | 'effects'
    | 'analysis'
    | 'visualization';

export interface FlowMessage {
    type: string;
    data: any;
    source: string;
    target?: string;
    timestamp: number;
}

/**
 * FlowConnect - Main SDK class
 */
export class FlowConnect {
    private config: FlowConnectConfig;
    private connected: boolean = false;
    private messageChannel: BroadcastChannel | null = null;
    private eventHandlers: Map<string, Set<Function>> = new Map();
    private debug: boolean = false;

    constructor(config: FlowConnectConfig) {
        this.config = config;
        this.debug = config.debug || false;
        this.log('FlowConnect SDK initialized', config);
    }

    /**
     * Connect to Flow DAW
     */
    async connect(): Promise<void> {
        if (this.connected) {
            this.log('Already connected');
            return;
        }

        try {
            // Use BroadcastChannel for cross-window communication
            this.messageChannel = new BroadcastChannel('flow-connect');

            // Listen for messages from Flow
            this.messageChannel.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            // Announce presence to Flow
            this.send('app:register', {
                appId: this.config.appId,
                appName: this.config.appName,
                version: this.config.version,
                capabilities: this.config.capabilities || [],
                timestamp: Date.now()
            });

            this.connected = true;
            this.log('🔗 Connected to Flow');

            if (this.config.onConnected) {
                this.config.onConnected();
            }
        } catch (error) {
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Disconnect from Flow
     */
    disconnect(): void {
        if (this.messageChannel) {
            this.send('app:unregister', {
                appId: this.config.appId
            });

            this.messageChannel.close();
            this.messageChannel = null;
        }

        this.connected = false;
        this.log('Disconnected from Flow');

        if (this.config.onDisconnected) {
            this.config.onDisconnected();
        }
    }

    /**
     * Send message to Flow
     */
    send(type: string, data: any, target?: string): void {
        if (!this.connected || !this.messageChannel) {
            this.log('Not connected - message queued', { type, data });
            return;
        }

        const message: FlowMessage = {
            type,
            data,
            source: this.config.appId,
            target,
            timestamp: Date.now()
        };

        this.messageChannel.postMessage(message);
        this.log('📤 Sent:', message);
    }

    /**
     * Subscribe to events from Flow
     */
    on(eventType: string, handler: (data: any) => void): () => void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }

        this.eventHandlers.get(eventType)!.add(handler);
        this.log(`Subscribed to: ${eventType}`);

        // Return unsubscribe function
        return () => {
            this.eventHandlers.get(eventType)?.delete(handler);
        };
    }

    /**
     * Share audio buffer with Flow
     */
    async shareAudio(audioData: {
        name: string;
        buffer: AudioBuffer;
        metadata?: Record<string, any>;
    }): Promise<void> {
        // Serialize AudioBuffer for transfer
        const channels: Float32Array[] = [];
        for (let i = 0; i < audioData.buffer.numberOfChannels; i++) {
            channels.push(audioData.buffer.getChannelData(i));
        }

        this.send('audio:share', {
            name: audioData.name,
            sampleRate: audioData.buffer.sampleRate,
            length: audioData.buffer.length,
            numberOfChannels: audioData.buffer.numberOfChannels,
            duration: audioData.buffer.duration,
            channels: channels.map(ch => Array.from(ch)),
            metadata: audioData.metadata || {}
        });

        this.log('🎵 Shared audio:', audioData.name);
    }

    /**
     * Request audio from Flow
     */
    async requestAudio(audioId: string): Promise<AudioBuffer | null> {
        return new Promise((resolve) => {
            const requestId = this.generateId();

            // Listen for response
            const unsubscribe = this.on('audio:response', (data) => {
                if (data.requestId === requestId) {
                    unsubscribe();

                    if (data.buffer) {
                        // Reconstruct AudioBuffer
                        const audioContext = new AudioContext();
                        const buffer = audioContext.createBuffer(
                            data.numberOfChannels,
                            data.length,
                            data.sampleRate
                        );

                        for (let i = 0; i < data.numberOfChannels; i++) {
                            buffer.copyToChannel(new Float32Array(data.channels[i]), i);
                        }

                        resolve(buffer);
                    } else {
                        resolve(null);
                    }
                }
            });

            // Send request
            this.send('audio:request', { requestId, audioId });

            // Timeout after 5 seconds
            setTimeout(() => {
                unsubscribe();
                resolve(null);
            }, 5000);
        });
    }

    /**
     * Update app status
     */
    updateStatus(status: {
        isProcessing?: boolean;
        progress?: number;
        message?: string;
    }): void {
        this.send('app:status', {
            appId: this.config.appId,
            ...status
        });
    }

    /**
     * Send analysis data to Flow
     */
    sendAnalysis(analysis: {
        type: 'spectral' | 'waveform' | 'bpm' | 'key' | 'custom';
        data: any;
        trackId?: string;
    }): void {
        this.send('analysis:data', {
            appId: this.config.appId,
            ...analysis
        });
    }

    /**
     * Handle incoming messages
     */
    private handleMessage(message: FlowMessage): void {
        this.log('📥 Received:', message);

        // Ignore our own messages
        if (message.source === this.config.appId) {
            return;
        }

        // Trigger event handlers
        const handlers = this.eventHandlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(message.data);
                } catch (error) {
                    this.log('Event handler error:', error);
                }
            });
        }
    }

    /**
     * Handle errors
     */
    private handleError(error: Error): void {
        this.log('❌ Error:', error);

        if (this.config.onError) {
            this.config.onError(error);
        }
    }

    /**
     * Debug logging
     */
    private log(...args: any[]): void {
        if (this.debug) {
            console.log(`[FlowConnect:${this.config.appName}]`, ...args);
        }
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `${this.config.appId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get connection status
     */
    isConnected(): boolean {
        return this.connected;
    }
}

/**
 * Create FlowConnect instance
 */
export function createFlowConnect(config: FlowConnectConfig): FlowConnect {
    return new FlowConnect(config);
}

/**
 * Default export for convenience
 */
export default FlowConnect;
