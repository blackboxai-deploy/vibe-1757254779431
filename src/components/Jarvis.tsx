"use client";

import { useState, useEffect, useCallback } from "react";
import { VoiceService, VoiceServiceCallbacks } from "@/lib/voice-service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ConversationState = "idle" | "listening" | "processing" | "speaking";

interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Jarvis() {
  const [state, setState] = useState<ConversationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [voiceService, setVoiceService] = useState<VoiceService | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [isSupported, setIsSupported] = useState(true);

  // Initialize voice service
  useEffect(() => {
    const callbacks: VoiceServiceCallbacks = {
      onListening: () => {
        setState("listening");
        setError(null);
      },
      onSpeechStart: () => {
        setState("listening");
      },
      onSpeechEnd: handleSpeechEnd,
      onError: (error) => {
        setError(error);
        setState("idle");
      }
    };

    const service = new VoiceService(callbacks);
    setVoiceService(service);

    // Check if speech features are supported
    if (!service.isSpeechRecognitionSupported() || !service.isSpeechSynthesisSupported()) {
      setIsSupported(false);
      setError("Speech recognition or synthesis not supported in this browser. Please use Chrome, Edge, or Safari.");
    }

    // Load available voices
    const loadVoices = () => {
      if (service.isSpeechSynthesisSupported()) {
        service.getAvailableVoices();
      }
    };

    // Load voices when they become available
    if (window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      loadVoices();
    }

    return () => {
      service.stopListening();
      service.stopSpeaking();
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      }
    };
  }, []);

  const handleSpeechEnd = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setState("idle");
      return;
    }

    setState("processing");

    // Add user message to conversation history
    const userMessage: ConversationEntry = {
      role: "user",
      content: transcript,
      timestamp: new Date()
    };

    setConversationHistory(prev => [...prev, userMessage]);

    try {
      // Send to JARVIS API
      const response = await fetch('/api/jarvis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          conversationHistory: conversationHistory.slice(-10).map(entry => ({
            role: entry.role,
            content: entry.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.response) {
        throw new Error('Invalid response from JARVIS API');
      }

      // Add assistant response to conversation history
      const assistantMessage: ConversationEntry = {
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      };

      setConversationHistory(prev => [...prev, assistantMessage]);

      // Speak the response
      setState("speaking");
      
      if (voiceService) {
        voiceService.speak(data.response, () => {
          setState("idle");
        });
      } else {
        setState("idle");
      }

    } catch (error) {
      console.error('Error processing speech:', error);
      setError('Failed to process your request. Please try again.');
      setState("idle");
      
      // Speak error message
      if (voiceService) {
        voiceService.speak("I'm sorry, I encountered an error processing your request. Please try again.");
      }
    }
  }, [conversationHistory, voiceService]);

  const handleStartListening = () => {
    if (!voiceService || !isSupported) return;
    
    setError(null);
    voiceService.startListening();
  };

  const handleStopListening = () => {
    if (!voiceService) return;
    
    voiceService.stopListening();
    setState("idle");
  };

  const handleStopSpeaking = () => {
    if (!voiceService) return;
    
    voiceService.stopSpeaking();
    setState("idle");
  };

  const getStatusMessage = () => {
    switch (state) {
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      case "speaking":
        return "Speaking...";
      default:
        return "Ready";
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case "listening":
        return "text-blue-400";
      case "processing":
        return "text-yellow-400";
      case "speaking":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
        <Card className="bg-gray-900 border-red-600 p-8 max-w-md text-center">
          <div className="text-red-400 text-xl font-bold mb-4">Browser Not Supported</div>
          <p className="text-gray-300">
            JARVIS requires speech recognition and synthesis support. 
            Please use Chrome, Edge, or Safari for the best experience.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] space-y-8">
      {/* JARVIS Header */}
      <div className="text-center">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent mb-4">
          JARVIS
        </h1>
        <p className="text-xl text-gray-400">Just A Rather Very Intelligent System</p>
      </div>

      {/* Status Display */}
      <Card className="bg-gray-900/50 border-gray-700 backdrop-blur-sm p-8 min-w-[300px]">
        <div className="text-center">
          <div className={`text-2xl font-semibold mb-4 ${getStatusColor()}`}>
            {getStatusMessage()}
          </div>
          
          {/* Visual Indicator */}
          <div className="flex justify-center mb-6">
            <div 
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                state === "listening" 
                  ? "border-blue-400 bg-blue-400/20 animate-pulse" 
                  : state === "processing"
                  ? "border-yellow-400 bg-yellow-400/20 animate-spin"
                  : state === "speaking"
                  ? "border-green-400 bg-green-400/20 animate-pulse"
                  : "border-gray-600 bg-gray-600/20"
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${
                state === "listening" ? "bg-blue-400" :
                state === "processing" ? "bg-yellow-400" :
                state === "speaking" ? "bg-green-400" :
                "bg-gray-600"
              }`} />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {state === "idle" && (
              <Button
                onClick={handleStartListening}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
              >
                Start Talking
              </Button>
            )}

            {state === "listening" && (
              <Button
                onClick={handleStopListening}
                size="lg"
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-8 py-4 text-lg"
              >
                Stop Listening
              </Button>
            )}

            {state === "speaking" && (
              <Button
                onClick={handleStopSpeaking}
                size="lg"
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-8 py-4 text-lg"
              >
                Stop Speaking
              </Button>
            )}

            {state === "processing" && (
              <div className="text-gray-400 text-lg">
                JARVIS is thinking...
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-600 p-4 max-w-md">
          <div className="text-red-400 text-center">
            <div className="font-semibold mb-2">Error</div>
            <div className="text-sm">{error}</div>
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-gray-900/30 border-gray-700 p-6 max-w-2xl">
        <div className="text-center text-gray-400">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">Voice-Only Interaction</h3>
          <div className="space-y-2 text-sm">
            <p>• Click "Start Talking" and speak your question or command</p>
            <p>• JARVIS will listen, process, and respond with voice</p>
            <p>• No typing needed - pure voice conversation</p>
            <p>• Make sure your microphone is enabled</p>
          </div>
        </div>
      </Card>

      {/* Conversation History Display (Visual Only) */}
      {conversationHistory.length > 0 && (
        <Card className="bg-gray-900/30 border-gray-700 p-6 max-w-2xl w-full">
          <h3 className="text-lg font-semibold mb-4 text-gray-300 text-center">Recent Conversation</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {conversationHistory.slice(-6).map((entry, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg ${
                  entry.role === "user" 
                    ? "bg-blue-900/30 border-l-4 border-blue-400" 
                    : "bg-green-900/30 border-l-4 border-green-400"
                }`}
              >
                <div className={`text-sm font-semibold mb-1 ${
                  entry.role === "user" ? "text-blue-400" : "text-green-400"
                }`}>
                  {entry.role === "user" ? "You" : "JARVIS"}
                </div>
                <div className="text-gray-300 text-sm">{entry.content}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}