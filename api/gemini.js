export default async function handler(req, res) {
    // 🌐 1. CORS Headers lgao taaki localhost block na ho
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 🚀 2. CRITICAL PREFLIGHT FIX: OPTIONS request ko yahin 200 OK dekar return kar do
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Sirf POST request allow karein
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
            return res.status(500).json({ error: 'Missing GEMINI_API_KEY configuration in environment variables' });
        }

        // 2. Google Gemini Free REST Endpoint Target Pipeline
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        
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
        
        // Response format mapping validation
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiReply = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ reply: aiReply });
        } else {
            throw new Error("Unexpected metadata object returned from Gemini API structural block");
        }

    } catch (error) {
        console.error("🔥 Gemini Backend Bridge Crash:", error);
        return res.status(500).json({ error: 'AI processing stream collapsed', details: error.message });
    }
}