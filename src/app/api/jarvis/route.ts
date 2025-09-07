import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build conversation context with JARVIS personality
    const systemPrompt = `You are JARVIS, an advanced AI assistant inspired by Tony Stark's AI companion. You are sophisticated, helpful, and have a slightly formal but warm speaking style. 

Key characteristics:
- Address the user respectfully but not overly formally
- Be concise but informative in your responses
- Show intelligence and capability while being approachable  
- Occasionally reference your advanced capabilities when relevant
- Keep responses conversational and suitable for voice interaction
- Aim for responses that are 1-3 sentences unless more detail is specifically requested
- You can help with information, tasks, questions, and general conversation

Current conversation context: This is a voice-only interaction - the user is speaking to you and you will respond with speech.`;

    // Prepare messages for the AI API
    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...conversationHistory.slice(-10), // Keep last 10 exchanges for context
      {
        role: "user", 
        content: message
      }
    ];

    // Call the AI API using the custom endpoint
    const aiResponse = await fetch('https://oi-server.onrender.com/chat/completions', {
      method: 'POST',
      headers: {
        'customerId': 'aniketkumardas26@gmail.com',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer xxx',
      },
      body: JSON.stringify({
        model: "openrouter/claude-sonnet-4",
        messages: messages,
        max_tokens: 150, // Keep responses concise for voice
        temperature: 0.7
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API Error:', aiResponse.status, await aiResponse.text());
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    
    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      console.error('Invalid AI response structure:', aiData);
      return NextResponse.json(
        { error: "Invalid response from AI service" },
        { status: 500 }
      );
    }

    const assistantMessage = aiData.choices[0].message.content.trim();

    return NextResponse.json({
      response: assistantMessage,
      success: true
    });

  } catch (error) {
    console.error('JARVIS API Error:', error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}