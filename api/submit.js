// ไฟล์: api/submit.js

export default async function handler(req, res) {
    // อนุญาตเฉพาะการส่งข้อมูลแบบ POST เท่านั้น
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ดึง URL ของ Google Apps Script จาก Environment Variables ของ Vercel
    const scriptUrl = process.env.GAS_API_URL;

    if (!scriptUrl) {
        return res.status(500).json({ error: 'GAS_API_URL is not defined in Environment Variables' });
    }

    try {
        // ส่งข้อมูลต่อไปยัง Google Apps Script
        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            // Vercel อาจจะแปลง body เป็น Object แล้ว เราจึงต้องแปลงกลับเป็น String ก่อนส่งให้ GAS
            body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
        });

        const result = await response.json();
        
        // ส่งผลลัพธ์กลับไปที่หน้าเว็บ
        res.status(200).json(result);
    } catch (error) {
        console.error("Fetch error:", error);
        res.status(500).json({ error: 'Failed to connect to database' });
    }
}
