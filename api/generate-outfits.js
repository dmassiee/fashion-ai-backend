export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { photo, occasion, vibe } = req.body;

    if (!photo || !occasion || !vibe) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: photo.split(',')[1]
              }
            },
            {
              type: 'text',
              text: `You are a professional fashion stylist AI. Analyze this person's photo carefully.

First, provide a brief physical description for an AI image generator (age range, build, general appearance - 1 sentence).

Then create 3 complete outfit recommendations for: "${occasion}" with vibe: "${vibe}".

Respond with JSON in this exact format:
{
  "personDescription": "brief physical description for image generation",
  "outfits": [
    {
      "name": "Outfit name",
      "description": "Why this outfit works (2 sentences)",
      "items": [
        {"piece": "Top", "details": "VERY specific: exact color, fabric, style, fit details", "searchTerm": "search term"},
        {"piece": "Bottom", "details": "VERY specific: exact color, fabric, style, fit details", "searchTerm": "search term"},
        {"piece": "Shoes", "details": "VERY specific: exact color, style, heel height", "searchTerm": "search term"},
        {"piece": "Accessories", "details": "VERY specific: what items, colors, materials", "searchTerm": "search term"}
      ]
    }
  ]
}

Be EXTREMELY detailed with colors, fabrics, and styles so AI can visualize accurately.`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Claude API error' });
    }

    const text = data.content.map(item => item.text || '').join('\n');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse outfit data' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
