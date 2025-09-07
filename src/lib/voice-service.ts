// Voice Service for Speech Recognition and Synthesis

// TypeScript declarations for Speech Recognition API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export interface VoiceServiceCallbacks {
  onListening?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export class VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private callbacks: VoiceServiceCallbacks;

  constructor(callbacks: VoiceServiceCallbacks = {}) {
    this.callbacks = callbacks;
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.callbacks.onError?.('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onListening?.();
      };

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.callbacks.onSpeechEnd?.(transcript);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        this.callbacks.onError?.(`Speech recognition error: ${event.error}`);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  public startListening(): void {
    if (!this.recognition) {
      this.callbacks.onError?.('Speech recognition not available');
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.recognition.start();
      this.callbacks.onSpeechStart?.();
    } catch (error) {
      this.callbacks.onError?.('Failed to start speech recognition');
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public speak(text: string, onComplete?: () => void): void {
    // Stop any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings for a more JARVIS-like experience
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    utterance.volume = 1.0;

    // Try to use a male voice if available
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('male') || 
      voice.name.toLowerCase().includes('david') ||
      voice.name.toLowerCase().includes('alex')
    ) || voices.find(voice => voice.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      onComplete?.();
    };

    utterance.onerror = () => {
      this.callbacks.onError?.('Speech synthesis failed');
      onComplete?.();
    };

    this.synthesis.speak(utterance);
  }

  public stopSpeaking(): void {
    this.synthesis.cancel();
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  public isSpeechRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  public isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }
}