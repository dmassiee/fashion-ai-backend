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
    const { prompt, replicateToken } = req.body;

    if (!prompt || !replicateToken) {
      return res.status(400).json({ error: 'Missing prompt or token' });
    }

    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        input: {
          prompt: prompt,
          negative_prompt: 'ugly, deformed, blurry, low quality, distorted, disfigured, bad anatomy, cartoon, anime',
          width: 768,
          height: 1024,
          num_outputs: 1,
          scheduler: 'K_EULER',
          num_inference_steps: 30,
          guidance_scale: 7.5
        }
      })
    });

    const prediction = await response.json();

    if (prediction.error) {
      return res.status(500).json({ error: prediction.error });
    }

    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 60;

    while (!imageUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${replicateToken}`,
          }
        }
      );
      
      const status = await statusResponse.json();
      
      if (status.status === 'succeeded' && status.output && status.output.length > 0) {
        imageUrl = status.output[0];
      } else if (status.status === 'failed') {
        return res.status(500).json({ error: 'Image generation failed' });
      }
      
      attempts++;
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Timeout waiting for image' });
    }

    return res.status(200).json({ imageUrl });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
