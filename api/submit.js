export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    const scriptUrl = process.env.GAS_API_URL;

    if (!scriptUrl) {
        return res.status(500).json({ status: 'error', message: 'GAS_API_URL is not defined in Environment Variables' });
    }

    const body = typeof req.body === 'string' ? safeJsonParse(req.body) : (req.body || {});
    const action = body?.action;

    if (!action) {
        return res.status(400).json({ status: 'error', message: 'action is required' });
    }

    const validationError = validatePayload(action, body);
    if (validationError) {
        return res.status(400).json({ status: 'error', message: validationError });
    }

    try {
        const payload = JSON.stringify(body);

        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: payload
        });

        const rawText = await response.text();
        let result;

        try {
            result = JSON.parse(rawText);
        } catch {
            result = {
                status: response.ok ? 'success' : 'error',
                message: rawText || 'Unexpected response from upstream service'
            };
        }

        return res.status(response.ok ? 200 : 502).json(result);
    } catch (error) {
        console.error('Fetch error:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to connect to database' });
    }
}

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

function validatePayload(action, body) {
    if (action === 'login') {
        if (!isNonEmptyString(body.username) || !isNonEmptyString(body.password)) {
            return 'username and password are required for login';
        }
        return null;
    }

    if (action === 'createLearnerGroup') {
        const members = Number(body.members);
        const progress = Number(body.progress);

        if (!isNonEmptyString(body.groupName)) {
            return 'groupName is required';
        }
        if (Number.isNaN(members) || members <= 0) {
            return 'members must be a number greater than 0';
        }
        if (Number.isNaN(progress) || progress < 0 || progress > 100) {
            return 'progress must be between 0 and 100';
        }

        return null;
    }

    return `unsupported action: ${action}`;
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

