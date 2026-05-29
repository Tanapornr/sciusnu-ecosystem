export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    }

    const scriptUrl = process.env.GAS_API_URL;

    if (!scriptUrl) {
        return res.status(500).json({ status: 'error', message: 'GAS_API_URL is not defined in Environment Variables' });
    }

    const body = typeof req.body === 'string' ? safeJsonParse(req.body) : (req.body || {});
    const action = resolveAction(body);

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

        const normalized = normalizeResultForAction(action, result);
        return res.status(response.ok ? 200 : 502).json(normalized);
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

    if (action === 'getUsers' || action === 'getTeachersData' || action === 'getStaffData' || action === 'listUsers') {
        return null;
    }

    // Allow unknown/new actions to pass through to GAS so front-end features
    // like lesson creation are not blocked by the proxy validator.
    return null;
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function resolveAction(body) {
    const explicitAction = typeof body?.action === 'string' ? body.action.trim() : '';
    if (explicitAction) return explicitAction;

    if (isNonEmptyString(body?.username) && isNonEmptyString(body?.password)) {
        return 'login';
    }

    if (isNonEmptyString(body?.groupName)) {
        return 'createLearnerGroup';
    }

    return '__passthrough__';
}

function normalizeResultForAction(action, result) {
    if (!result || typeof result !== 'object') return result;

    // User requested to start fresh: force all learning metrics to zero
    // whenever user list is fetched by admin/staff dashboards.
    if (action === 'getUsers' || action === 'getTeachersData' || action === 'getStaffData' || action === 'listUsers') {
        const users = Array.isArray(result.users) ? result.users : [];
        const normalizedUsers = users.map((u) => ({
            ...u,
            preScore: 0,
            postScore: 0,
            progress: '0%',
            accessCount: Number(u?.accessCount || 0),
            lessonProgress: '',
            reflection: u?.reflection || '',
            reflectionUpdatedAt: u?.reflectionUpdatedAt || ''
        }));
        return { ...result, users: normalizedUsers };
    }

    return result;
}

