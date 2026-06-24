export default async function handler(req, res) {
    // 🌐 CORS Headers lagaye rakhein taaki localhost block na ho
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
        return res.status(400).json({ error: 'Message parameter is missing' });
    }

    try {
        const GROQ_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_KEY) {
            return res.status(500).json({ error: 'Missing GROQ_API_KEY configuration in Vercel' });
        }

        // 🚀 GROQ CLOUD PIPELINE: Open-source Llama-3-8b model ka free use
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-8b-8192", // Powerful, reliable and 100% Free Tier Model
                messages: [{ role: "user", content: message }]
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]?.message?.content) {
            const aiReply = data.choices[0].message.content;
            
            // 🔥 SMART MAPPING: Output ko 'reply' object mein bheja taaki frontend ko pata bhi na chale aur smoothly chale!
            return res.status(200).json({ reply: aiReply });
        } else {
            return res.status(500).json({ error: 'Unexpected structural payload from Groq', rawData: data });
        }

    } catch (error) {
        console.error("🔥 Groq Backend Bridge Crash:", error);
        return res.status(500).json({ error: 'AI processing stream collapsed', details: error.message });
    }
}