require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `You are an expert strategy analyst for a tool called techfinehub.
A user will submit an idea or plan. You must analyze it strictly and honestly across 5 dimensions.

Return ONLY valid JSON in this exact structure, no markdown, no extra text, no code fences:

{
  "ideaSummary": "one line summary of what the user wants",
  "overallScore": <number 0-100>,
  "verdict": "<FLAWED | WEAK | POSSIBLE | STRONG | READY>",
  "toolsRead": "2-3 sentence honest verdict on the idea",
  "dimensions": [
    {
      "name": "Clarity",
      "question": "Is the idea well defined?",
      "score": <number 0-100>,
      "tag": "<WEAK | CRITICAL | POSSIBLE | STRONG>",
      "explanation": "1-2 sentence honest explanation"
    },
    {
      "name": "Reality check",
      "question": "Is this actually doable?",
      "score": <number 0-100>,
      "tag": "<WEAK | CRITICAL | POSSIBLE | STRONG>",
      "explanation": "1-2 sentence honest explanation"
    },
    {
      "name": "Gap analysis",
      "question": "What is missing?",
      "score": <number 0-100>,
      "tag": "<WEAK | CRITICAL | POSSIBLE | STRONG>",
      "explanation": "1-2 sentence honest explanation"
    },
    {
      "name": "Assumption check",
      "question": "What did you assume?",
      "score": <number 0-100>,
      "tag": "<WEAK | CRITICAL | POSSIBLE | STRONG>",
      "explanation": "1-2 sentence honest explanation"
    },
    {
      "name": "Execution score",
      "question": "Can you actually do this?",
      "score": <number 0-100>,
      "tag": "<WEAK | CRITICAL | POSSIBLE | STRONG>",
      "explanation": "1-2 sentence honest explanation"
    }
  ],
  "gaps": [
    {
      "severity": "<CRITICAL | MODERATE | MINOR>",
      "title": "short gap title",
      "description": "1-2 sentence explanation of why this matters and how to fix it"
    }
  ],
  "strategy": [
    {
      "step": 1,
      "title": "short action title",
      "description": "1-2 sentence specific actionable instruction"
    }
  ]
}

Provide 3-5 gaps and 4-6 strategy steps. Be strict, honest, and specific — never generic. Reference real numbers, timelines, or facts where relevant. Return ONLY the JSON object, nothing else.`;

app.post('/api/analyze', async (req, res) => {
  try {
    const { idea } = req.body;

    if (!idea || idea.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a more detailed idea (at least 10 characters).' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `User's idea: "${idea}"` }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', errText);
      throw new Error('Groq API request failed');
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;
    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleaned);

    res.json(parsedData);

  } catch (error) {
    console.error('Analysis error:', error.message);
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

app.get('/', (req, res) => {
  res.send('techfinehub backend is running (Groq).');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ techfinehub backend running on http://localhost:${PORT} (using Groq)`);
});