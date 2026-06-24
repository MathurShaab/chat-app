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

    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message query parameter is missing' });
    }

    try {
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) {
            return res.status(500).json({ error: 'Missing GEMINI_API_KEY configuration' });
        }

        // 🚀 THE ULTIMATE FIX: Model name ko 'gemini-1.5-flash-latest' kiya hai 
        // (Aap chahein toh iski jagah 'gemini-2.0-flash' bhi use kar sakte hain)
        const modelIdentifier = "gemini-2.0-flash";
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelIdentifier}:generateContent?key=${GEMINI_KEY}`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: message }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            return res.status(500).json({ 
                error: 'Google Gemini API Rejected Request', 
                googleErrorDetails: data.error 
            });
        }
        
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const aiReply = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ reply: aiReply });
        } else {
            return res.status(500).json({ 
                error: 'Unexpected structural payload received from Google', 
                rawPayloadReceived: data 
            });
        }

    } catch (error) {
        console.error("🔥 Gemini Backend Bridge Crash:", error);
        return res.status(500).json({ error: 'AI processing stream collapsed', details: error.message });
    }
}