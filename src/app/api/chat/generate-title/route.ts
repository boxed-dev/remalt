import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generate a concise chat title from user's first message
 * Uses Gemini to create a 3-5 word descriptive title
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Generate a concise, descriptive title (3-5 words maximum) for a chat conversation based on this first user message. The title should capture the main topic or intent. Respond with ONLY the title, nothing else.

User message: "${message}"

Title:`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    // Clean up the title (remove quotes, extra spaces, etc.)
    const cleanTitle = title
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim()
      .slice(0, 50); // Max 50 characters

    return NextResponse.json({ title: cleanTitle });
  } catch (error) {
    console.error('Error generating chat title:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
}
