export class API {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.sessionId = null;
    }

    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.sessionId && !endpoint.includes('/session')) {
            headers['X-Session-ID'] = this.sessionId;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Request failed');
        }

        return response.json();
    }

    async validateSession(sessionId) {
        return this.request('/api/session', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId })
        });
    }

    async getThreads() {
        return this.request('/api/threads');
    }

    async getMessages(threadId) {
        return this.request(`/api/threads/${threadId}/messages`);
    }

    async unsendMessages(threadId, messageIds) {
        return this.request('/api/messages/unsend', {
            method: 'POST',
            body: JSON.stringify({
                thread_id: threadId,
                message_ids: messageIds
            })
        });
    }
}