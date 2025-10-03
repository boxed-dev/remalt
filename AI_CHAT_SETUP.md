# AI Chat Setup Guide

## 🚀 Quick Start

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the generated key

### 2. Add API Key to Your Project

Open `.env.local` in the project root and add:

```bash
GEMINI_API_KEY=your_api_key_here
```

### 3. Restart the Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## ✅ That's It!

The chat is now fully functional with:
- ✅ Real AI responses powered by Gemini 1.5 Flash
- ✅ YouTube video context (native support!)
- ✅ Text node context
- ✅ Automatic context building from linked nodes

## 🎯 How to Use

### Basic Chat
1. Go to http://localhost:3000/flows
2. Create a new flow
3. Drag a **Chat** node onto the canvas
4. Type a message and press Enter

### Chat with Context

#### Add Text Context:
1. Drag a **Text** node
2. Click it and add some text (e.g., "The capital of France is Paris")
3. Drag a **Chat** node
4. Connect Text → Chat (drag from Text bottom handle to Chat top handle)
5. Ask "What's the capital of France?" in the chat
6. The AI will use the text context!

#### Add YouTube Context:
1. Drag a **YouTube** node
2. Click it and paste a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
3. Drag a **Chat** node
4. Connect YouTube → Chat
5. Ask questions about the video!
6. Gemini will analyze the video content (audio + visual)

#### Multiple Context Sources:
1. Add multiple Text and YouTube nodes
2. Connect them all to a single Chat node
3. The chat will have ALL the context!
4. See the green indicator showing "X context sources"

## 🔧 How It Works

### Context Building
When you connect nodes to a Chat node:
- The system automatically detects incoming connections
- Extracts content from Text nodes
- Extracts YouTube URLs from YouTube nodes
- Sends everything to Gemini with your question

### Gemini's YouTube Superpowers
Gemini 1.5 Flash can:
- Watch and understand video content
- Hear and transcribe audio
- Answer questions about specific moments
- Summarize entire videos
- Compare multiple videos

### Example Workflow:
```
[Text: "Budget: $1000"]  ─┐
                          ├─→ [Chat: "Which laptop should I buy?"]
[YouTube: laptop review]  ─┘
```

The AI will recommend laptops considering:
- Your $1000 budget (from Text node)
- Information from the review video (from YouTube node)

## 🐛 Troubleshooting

### "GEMINI_API_KEY is not configured"
- Make sure you added the API key to `.env.local`
- Restart the dev server after adding the key

### Chat not responding
- Check browser console for errors
- Verify API key is valid
- Check if you have API quota remaining

### Context not working
- Make sure nodes are **connected** with edges
- Green "X context sources" indicator should show the count
- Text nodes must have content
- YouTube nodes must have a valid URL

## 📝 API Rate Limits

Gemini 1.5 Flash free tier:
- 15 requests per minute
- 1 million tokens per minute
- 1,500 requests per day

For production, consider upgrading to a paid plan.

## 🎓 Pro Tips

1. **Multiple Videos**: Connect multiple YouTube nodes to compare/contrast content
2. **Research Assistant**: Add text with sources, then ask the AI to synthesize
3. **Video Summaries**: Just connect a YouTube node and ask "Summarize this video"
4. **Fact Checking**: Add text claims, then add YouTube sources to verify
5. **Learning**: Add tutorial videos + your notes, ask specific questions

Enjoy building with real AI! 🚀
