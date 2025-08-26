// This file goes in: netlify/functions/gemini.js

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { prompt, isJson } = JSON.parse(event.body);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key is not set.' }) };
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (isJson) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                options: { type: "ARRAY", items: { type: "STRING" } },
                answer: { type: "NUMBER" },
                explanation: { type: "STRING" },
                domain: { type: "STRING" },
              },
              required: ["question", "options", "answer", "explanation", "domain"],
            },
          },
        },
        required: ["questions"],
      },
    };
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Google API Error:', errorBody);
      return { statusCode: response.status, body: JSON.stringify({ error: 'Failed to fetch from Google API.', details: errorBody }) };
    }

    const result = await response.json();
    const part = result.candidates[0].content.parts[0];
    
    // The API returns the JSON as a string, so we parse it before sending it back.
    // For text, we just send the text.
    const finalPayload = isJson ? JSON.parse(part.text) : { text: part.text };

    return {
      statusCode: 200,
      body: JSON.stringify(finalPayload),
    };
  } catch (error) {
    console.error('Netlify Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An internal error occurred.' }),
    };
  }
};
