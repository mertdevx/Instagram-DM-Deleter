document.addEventListener('DOMContentLoaded', () => {
    const sessionIdField = document.getElementById('sessionId');
    const copyBtn = document.getElementById('copyBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const status = document.getElementById('status');
    const sessionState = document.getElementById('sessionState');

    const setStatus = (message, type = 'info') => {
        status.textContent = message;
        status.className = type;
    };

    const setSessionState = (label, hasSession) => {
        sessionState.textContent = label;
        copyBtn.disabled = !hasSession;
    };

    const loadSession = () => {
        setSessionState('Checking', false);
        setStatus('Checking Instagram session cookie...');
        sessionIdField.value = '';

        chrome.cookies.get({ url: 'https://www.instagram.com', name: 'sessionid' }, (cookie) => {
            if (chrome.runtime.lastError) {
                setSessionState('Error', false);
                setStatus(chrome.runtime.lastError.message || 'Could not read cookies.', 'error');
                return;
            }

            if (!cookie || !cookie.value) {
                setSessionState('Not found', false);
                setStatus('No Instagram session found. Log in to instagram.com, then click Refresh.', 'error');
                return;
            }

            sessionIdField.value = cookie.value;
            setSessionState('Ready', true);
            setStatus('Session detected. Copy it and paste into Instagram DM Deleter.', 'success');
        });
    };

    copyBtn.addEventListener('click', async () => {
        const value = sessionIdField.value.trim();
        if (!value) {
            setStatus('No session ID available to copy.', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            setStatus('Copied to clipboard.', 'success');
        } catch (error) {
            sessionIdField.select();
            document.execCommand('copy');
            setStatus('Copied using fallback clipboard method.', 'success');
        }
    });

    refreshBtn.addEventListener('click', loadSession);
    loadSession();
});
