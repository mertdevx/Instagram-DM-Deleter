import { API } from './api.js';
import { UI } from './ui.js';

class App {
    constructor() {
        this.api = new API(window.location.origin);
        this.ui = new UI();
        this.sessionId = localStorage.getItem('sessionId') || null;
        this.currentThread = null;
        this.selectedMessages = new Set();
        this.allMessages = [];
        this.threads = [];
        this.nextMessagesCursor = null;
        this.hasOlderMessages = false;
        this.isLoadingOlderMessages = false;
        this.isLoadingAllMessages = false;
        this.isSessionValidated = false;
        this.activeUnsendJobId = null;
        this.activeUnsendJobThreadId = null;
        this.unsendJobPollTimer = null;
        this.hasRenderedUnsendJob = false;
        
        this.init();
        window.addEventListener('popstate', () => this.handleRoute());
        this.bootstrap();
    }

    async bootstrap() {
        if (this.sessionId) {
            this.api.setSessionId(this.sessionId);
            document.getElementById('sessionId').value = this.sessionId;
        }

        await this.handleRoute();
    }
    
    async checkExistingSession() {
        if (this.sessionId) {
            this.api.setSessionId(this.sessionId);
            document.getElementById('sessionId').value = this.sessionId;
            try {
                await this.loadThreads();
                this.showThreadsView();
            } catch (error) {
                localStorage.removeItem('sessionId');
                this.sessionId = null;
            }
        }
    }

    getRoute() {
        const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
        if (!path) return { name: 'dashboard' };
        if (path === 'login') return { name: 'login' };
        return { name: 'thread', threadId: decodeURIComponent(path) };
    }

    navigate(path, replace = false) {
        const normalizedPath = path || '/';
        if (window.location.pathname === normalizedPath) return;

        const method = replace ? 'replaceState' : 'pushState';
        window.history[method]({}, '', normalizedPath);
    }

    async ensureSession() {
        if (!this.sessionId) {
            this.navigate('/login', true);
            this.ui.showView('sessionView');
            return false;
        }

        this.api.setSessionId(this.sessionId);
        if (!this.isSessionValidated) {
            try {
                await this.api.validateSession(this.sessionId);
                this.isSessionValidated = true;
            } catch (error) {
                localStorage.removeItem('sessionId');
                this.sessionId = null;
                this.isSessionValidated = false;
                this.navigate('/login', true);
                this.ui.showView('sessionView');
                this.ui.showToast('Stored session expired. Please connect again.', 'error');
                return false;
            }
        }

        return true;
    }

    async handleRoute() {
        const route = this.getRoute();

        if (route.name === 'login') {
            this.ui.showView('sessionView');
            return;
        }

        if (!(await this.ensureSession())) {
            return;
        }

        if (!this.threads || this.threads.length === 0) {
            await this.loadThreads();
        }

        if (route.name === 'dashboard') {
            this.showThreadsView(false);
            return;
        }

        if (route.name === 'thread') {
            const thread = this.threads.find(item => item.thread_id === route.threadId);
            if (thread) {
                await this.openThread(thread, false);
            } else {
                this.ui.showToast('Conversation not found', 'error');
                this.navigate('/', true);
                this.showThreadsView(false);
            }
        }
    }
    
    init() {
        // Session view
        document.getElementById('connectBtn')
            .addEventListener('click', () => this.handleConnect());
        
        document.getElementById('sessionId')
            .addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleConnect();
            });
        
        // Threads view
        document.getElementById('logoutBtn')
            .addEventListener('click', () => this.handleLogout());
        
        document.getElementById('searchInput')
            .addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Messages view
        document.getElementById('backBtn')
            .addEventListener('click', () => this.showThreadsView());
        
        document.getElementById('selectAllBtn')
            .addEventListener('click', () => this.selectAllMyMessages());

        document.getElementById('downloadTranscriptBtn')
            .addEventListener('click', () => this.openTranscriptModal());

        document.getElementById('closeTranscriptModalBtn')
            .addEventListener('click', () => this.closeTranscriptModal());

        document.getElementById('transcriptModal')
            .addEventListener('click', (event) => {
                if (event.target.id === 'transcriptModal') {
                    this.closeTranscriptModal();
                }
            });

        document.querySelectorAll('[data-transcript-format]').forEach(button => {
            button.addEventListener('click', () => this.downloadTranscript(button.dataset.transcriptFormat));
        });

        document.addEventListener('click', (event) => {
            const loadAllButton = event.target.closest('#loadAllBtn');
            if (loadAllButton) {
                event.preventDefault();
                event.stopPropagation();
                this.loadAllMessages();
            }
        });
        
        document.getElementById('unsendBtn')
            .addEventListener('click', () => this.handleUnsend());

        document.getElementById('cancelJobBtn')
            .addEventListener('click', () => this.cancelActiveUnsendJob());

        document.getElementById('messagesList')
            .addEventListener('scroll', () => this.handleMessagesScroll());

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeTranscriptModal();
            }
        });

        this.hideJobPanel();
        this.updateTranscriptButton();
    }
    
    async handleConnect() {
        const sessionId = document.getElementById('sessionId').value.trim();
        
        if (!sessionId) {
            this.ui.showToast('Please enter a session ID', 'error');
            return;
        }
        
        this.ui.showLoader();
        
        try {
            const response = await this.api.validateSession(sessionId);
            this.sessionId = sessionId;
            this.api.setSessionId(sessionId);
            this.isSessionValidated = true;
            localStorage.setItem('sessionId', sessionId);
             
            this.ui.showToast(`Welcome, ${response.user.username}!`, 'success');
            await this.loadThreads();
            this.showThreadsView();
        } catch (error) {
            this.ui.showToast(`Connection failed: ${error.message}`, 'error');
        } finally {
            this.ui.hideLoader();
        }
    }
    
    async loadThreads() {
        this.ui.showLoader();
        
        try {
            const response = await this.api.getThreads();
            this.threads = response.threads;
            this.renderThreads(response.threads);
            this.updateThreadsCount(response.threads.length);
        } catch (error) {
            this.ui.showToast('Failed to load conversations', 'error');
        } finally {
            this.ui.hideLoader();
        }
    }
    
    renderThreads(threads) {
        const container = document.getElementById('threadsList');
        container.innerHTML = '';
        this.updateThreadsCount(threads.length);
        
        if (threads.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--md-on-surface-variant);">
                    <span class="material-icons" style="font-size: 64px; opacity: 0.3;">forum</span>
                    <p>No conversations found</p>
                </div>
            `;
            return;
        }
        
        threads.forEach(thread => {
            const div = document.createElement('div');
            div.className = 'thread-item';
            
            const profilePic = thread.users[0]?.profile_pic_url || '';
            const title = thread.thread_title || 'Unknown';
            const preview = thread.last_message || 'No messages';
            const messageCount = thread.message_count || 0;
            
            div.innerHTML = `
                <div class="thread-avatar">
                    ${profilePic ?
                        `<img src="${profilePic}" alt="${title}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.parentElement.innerHTML='<span class=\\'material-icons\\'>person</span>'">` :
                        `<span class="material-icons">person</span>`
                    }
                </div>
                <div class="thread-info">
                    <div class="thread-name">${this.escapeHtml(title)}</div>
                    <div class="thread-preview">${this.escapeHtml(preview)}</div>
                </div>
                <div class="thread-meta">
                    ${messageCount > 0 ? `<span class="thread-count">${messageCount}</span>` : ''}
                    <span class="material-icons" style="color: var(--md-on-surface-variant);">chevron_right</span>
                </div>
            `;
            
            div.addEventListener('click', () => this.openThread(thread));
            container.appendChild(div);
        });
    }
    
    handleSearch(query) {
        if (!this.threads) return;
        
        const filtered = this.threads.filter(thread => 
            thread.thread_title.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderThreads(filtered);
    }

    updateThreadsCount(count) {
        const countElement = document.getElementById('threadsCount');
        if (countElement) {
            countElement.textContent = `${count} chat${count === 1 ? '' : 's'}`;
        }
    }
    
    async openThread(thread, updateUrl = true, options = {}) {
        if (updateUrl) {
            this.navigate(`/${encodeURIComponent(thread.thread_id)}`);
        }

        const preserveJobPanel = Boolean(options.preserveJobPanel);
        this.currentThread = thread;
        this.selectedMessages.clear();
        if (!preserveJobPanel) {
            this.hideJobPanel();
            this.hasRenderedUnsendJob = false;
        }
        this.allMessages = [];
        this.nextMessagesCursor = null;
        this.hasOlderMessages = false;
        this.isLoadingOlderMessages = false;
        this.isLoadingAllMessages = false;
        this.updateLoadAllButton();
        this.updateTranscriptButton();
        this.closeTranscriptModal();
        this.ui.showLoader();
        
        try {
            const response = await this.api.getMessages(thread.thread_id);
            this.allMessages = this.normalizeMessages(response.messages);
            this.nextMessagesCursor = response.next_cursor || null;
            this.hasOlderMessages = Boolean(this.nextMessagesCursor || response.has_older);
            this.showMessagesView(thread.thread_title);
            this.renderMessages(this.allMessages, { scrollToBottom: true });
            this.updateMessagesCount();
            this.updateLoadAllButton();
        } catch (error) {
            this.ui.showToast('Failed to load messages', 'error');
        } finally {
            this.ui.hideLoader();
            this.updateLoadAllButton();
        }
    }
    
    async handleMessagesScroll() {
        const container = document.getElementById('messagesList');

        if (
            container.scrollTop > 80 ||
            !this.currentThread ||
            !this.hasOlderMessages ||
            !this.nextMessagesCursor ||
            this.isLoadingOlderMessages ||
            this.isLoadingAllMessages
        ) {
            return;
        }

        await this.loadOlderMessages();
    }

    async loadOlderMessages() {
        const container = document.getElementById('messagesList');
        const previousScrollHeight = container.scrollHeight;
        this.isLoadingOlderMessages = true;

        try {
            const response = await this.api.getMessages(
                this.currentThread.thread_id,
                this.nextMessagesCursor
            );
            const olderMessages = this.normalizeMessages(response.messages);
            const existingIds = new Set(this.allMessages.map(msg => msg.id));
            const newOlderMessages = olderMessages.filter(msg => !existingIds.has(msg.id));

            this.allMessages = [...newOlderMessages, ...this.allMessages];
            this.nextMessagesCursor = response.next_cursor || null;
            this.hasOlderMessages = Boolean(response.has_older && this.nextMessagesCursor);
            this.renderMessages(this.allMessages, { scrollToBottom: false });
            this.updateMessagesCount();
            this.updateLoadAllButton();

            container.scrollTop = container.scrollHeight - previousScrollHeight;
        } catch (error) {
            this.ui.showToast(`Failed to load older messages: ${error.message}`, 'error');
        } finally {
            this.isLoadingOlderMessages = false;
            this.updateLoadAllButton();
        }
    }

    async loadAllMessages() {
        console.log('Load All DM clicked', {
            currentThread: this.currentThread?.thread_id,
            nextMessagesCursor: this.nextMessagesCursor,
            hasOlderMessages: this.hasOlderMessages,
            isLoadingAllMessages: this.isLoadingAllMessages
        });

        if (
            !this.currentThread ||
            this.isLoadingAllMessages
        ) {
            this.ui.showToast('Conversation is not ready yet', 'info');
            return;
        }

        const container = document.getElementById('messagesList');
        this.isLoadingAllMessages = true;
        this.updateLoadAllButton();

        try {
            let loadedCount = 0;
            if (!this.nextMessagesCursor) {
                const bootstrapResponse = await this.api.getMessages(
                    this.currentThread.thread_id,
                    null,
                    50
                );
                const bootstrapMessages = this.normalizeMessages(bootstrapResponse.messages);
                const existingIds = new Set(this.allMessages.map(msg => msg.id));
                const newBootstrapMessages = bootstrapMessages.filter(msg => !existingIds.has(msg.id));

                this.allMessages = [...this.allMessages, ...newBootstrapMessages];
                this.nextMessagesCursor = bootstrapResponse.next_cursor || null;
                this.hasOlderMessages = Boolean(this.nextMessagesCursor || bootstrapResponse.has_older);
                this.renderMessages(this.allMessages, { scrollToBottom: false });
                this.updateMessagesCount();
                this.updateLoadAllButton(`Preparing... ${this.allMessages.length}`);
            }

            while (this.nextMessagesCursor) {
                const response = await this.api.getMessages(
                    this.currentThread.thread_id,
                    this.nextMessagesCursor,
                    50
                );
                const olderMessages = this.normalizeMessages(response.messages);
                const existingIds = new Set(this.allMessages.map(msg => msg.id));
                const newOlderMessages = olderMessages.filter(msg => !existingIds.has(msg.id));

                if (newOlderMessages.length === 0 && (!response.next_cursor || response.next_cursor === this.nextMessagesCursor)) {
                    this.hasOlderMessages = false;
                    this.nextMessagesCursor = null;
                    break;
                }

                loadedCount += newOlderMessages.length;
                this.allMessages = [...newOlderMessages, ...this.allMessages];
                this.nextMessagesCursor = response.next_cursor || null;
                this.hasOlderMessages = Boolean(this.nextMessagesCursor);
                this.renderMessages(this.allMessages, { scrollToBottom: false });
                this.updateMessagesCount();
                this.updateLoadAllButton(`Loading... ${this.allMessages.length}`);

                await new Promise(resolve => setTimeout(resolve, 350));
            }

            container.scrollTop = 0;
            this.ui.showToast(`Loaded ${loadedCount} older message${loadedCount === 1 ? '' : 's'}`, 'success');
        } catch (error) {
            this.ui.showToast(`Failed to load all messages: ${error.message}`, 'error');
        } finally {
            this.isLoadingAllMessages = false;
            this.updateLoadAllButton();
        }
    }

    updateLoadAllButton(label = null) {
        const button = document.getElementById('loadAllBtn');
        if (!button) return;

        const disabled = !this.currentThread || this.isLoadingAllMessages;
        button.disabled = disabled;
        button.innerHTML = `
            <span class="material-icons">${this.isLoadingAllMessages ? 'sync' : 'download'}</span>
            <span>${label || (this.nextMessagesCursor ? 'Load All DM' : 'Load All DM')}</span>
        `;
        button.classList.toggle('is-loading', this.isLoadingAllMessages);
    }

    updateTranscriptButton() {
        const button = document.getElementById('downloadTranscriptBtn');
        if (!button) return;

        const count = this.allMessages.length;
        button.disabled = !this.currentThread || count === 0;
        button.innerHTML = `
            <span class="material-icons">description</span>
            <span>Transcript (${count})</span>
        `;
    }

    normalizeMessages(messages) {
        return [...messages].reverse();
    }

    updateMessagesCount() {
        const countElement = document.getElementById('messagesCount');
        if (countElement) {
            const olderLabel = this.hasOlderMessages ? ' · scroll up for more' : '';
            countElement.textContent = `${this.allMessages.length} message${this.allMessages.length === 1 ? '' : 's'}${olderLabel}`;
        }
        this.updateLoadAllButton();
        this.updateTranscriptButton();
    }

    openTranscriptModal() {
        if (!this.currentThread || this.allMessages.length === 0) {
            this.ui.showToast('No loaded messages to export', 'info');
            return;
        }

        const modal = document.getElementById('transcriptModal');
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.remove('hidden');
    }

    closeTranscriptModal() {
        const modal = document.getElementById('transcriptModal');
        if (!modal) return;

        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.add('hidden');
    }

    getTranscriptPayload() {
        const exportedAt = new Date().toISOString();
        return {
            exported_at: exportedAt,
            thread: {
                thread_id: this.currentThread?.thread_id || '',
                title: this.currentThread?.thread_title || 'Conversation',
                message_count_loaded: this.allMessages.length,
                has_more_messages: this.hasOlderMessages
            },
            messages: this.allMessages.map((message, index) => ({
                index: index + 1,
                id: message.id || '',
                sender: message.is_mine ? 'You' : (message.user_name || 'User'),
                user_id: message.user_id || '',
                is_mine: Boolean(message.is_mine),
                text: message.text || '',
                timestamp: message.timestamp || null,
                datetime: this.getIsoTime(message.timestamp),
                my_reactions: message.my_reactions || []
            }))
        };
    }

    downloadTranscript(format) {
        if (!['json', 'html', 'xml'].includes(format)) return;
        if (!this.currentThread || this.allMessages.length === 0) {
            this.ui.showToast('No loaded messages to export', 'info');
            return;
        }

        const payload = this.getTranscriptPayload();
        const builders = {
            json: () => ({
                content: JSON.stringify(payload, null, 2),
                mime: 'application/json;charset=utf-8'
            }),
            html: () => ({
                content: this.buildTranscriptHtml(payload),
                mime: 'text/html;charset=utf-8'
            }),
            xml: () => ({
                content: this.buildTranscriptXml(payload),
                mime: 'application/xml;charset=utf-8'
            })
        };

        const { content, mime } = builders[format]();
        const filename = `${this.slugify(payload.thread.title || payload.thread.thread_id)}-transcript.${format}`;
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        this.closeTranscriptModal();
        this.ui.showToast(`Transcript downloaded as ${format.toUpperCase()}`, 'success');
    }

    buildTranscriptHtml(payload) {
        const rows = payload.messages.map(message => {
            const reactions = message.my_reactions.length > 0
                ? `<div class="reactions">Your reactions: ${message.my_reactions.map(reaction => this.escapeHtml(reaction.emoji || '')).join(' ')}</div>`
                : '';

            return `
            <article class="message ${message.is_mine ? 'mine' : 'theirs'}">
                <header>
                    <strong>${this.escapeHtml(message.sender)}</strong>
                    <time datetime="${this.escapeHtml(message.datetime || '')}">${this.escapeHtml(message.datetime || '')}</time>
                </header>
                <p>${this.escapeHtml(message.text || '(No text)')}</p>
                ${reactions}
            </article>
        `;
        }).join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(payload.thread.title)} Transcript</title>
    <style>
        body { font-family: Inter, Arial, sans-serif; margin: 0; background: #f6f9fc; color: #0a2540; }
        main { max-width: 920px; margin: 0 auto; padding: 32px 18px; }
        .header { margin-bottom: 24px; padding: 24px; border-radius: 18px; background: #ffffff; border: 1px solid #e6ebf1; }
        .header h1 { margin: 0 0 8px; font-size: 28px; }
        .header p { margin: 0; color: #425466; }
        .message { margin: 12px 0; padding: 16px; border-radius: 16px; border: 1px solid #e6ebf1; background: #ffffff; }
        .message.mine { background: #eef0ff; margin-left: 12%; }
        .message.theirs { margin-right: 12%; }
        .message header { display: flex; justify-content: space-between; gap: 16px; color: #425466; font-size: 13px; }
        .message p { margin: 10px 0 0; white-space: pre-wrap; line-height: 1.55; }
        .reactions { margin-top: 10px; color: #9a3412; font-size: 13px; }
    </style>
</head>
<body>
    <main>
        <section class="header">
            <h1>${this.escapeHtml(payload.thread.title)}</h1>
            <p>${payload.thread.message_count_loaded} loaded messages · Exported ${this.escapeHtml(payload.exported_at)}</p>
        </section>
        ${rows}
    </main>
</body>
</html>`;
    }

    buildTranscriptXml(payload) {
        const messages = payload.messages.map(message => {
            const reactions = message.my_reactions.map(reaction => `
            <reaction>${this.escapeXml(reaction.emoji || '')}</reaction>`).join('');

            return `
    <message index="${message.index}" id="${this.escapeXml(message.id)}" is_mine="${message.is_mine}">
        <sender>${this.escapeXml(message.sender)}</sender>
        <user_id>${this.escapeXml(String(message.user_id || ''))}</user_id>
        <timestamp>${this.escapeXml(String(message.timestamp || ''))}</timestamp>
        <datetime>${this.escapeXml(message.datetime || '')}</datetime>
        <text>${this.escapeXml(message.text || '')}</text>
        <my_reactions>${reactions}
        </my_reactions>
    </message>`;
        }).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<transcript exported_at="${this.escapeXml(payload.exported_at)}">
    <thread id="${this.escapeXml(payload.thread.thread_id)}">
        <title>${this.escapeXml(payload.thread.title)}</title>
        <message_count_loaded>${payload.thread.message_count_loaded}</message_count_loaded>
        <has_more_messages>${payload.thread.has_more_messages}</has_more_messages>
    </thread>
    <messages>${messages}
    </messages>
</transcript>`;
    }

    getIsoTime(timestamp) {
        if (!timestamp) return '';
        const normalizedTimestamp = typeof timestamp === 'string'
            ? Date.parse(timestamp)
            : timestamp * 1000;
        const date = new Date(normalizedTimestamp);
        return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    }

    slugify(value) {
        return String(value || 'instagram-dm')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'instagram-dm';
    }

    escapeXml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    renderMessages(messages, options = {}) {
        const container = document.getElementById('messagesList');
        container.innerHTML = '';
        const { scrollToBottom = false } = options;
        
        if (messages.length === 0) {
            container.innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--md-on-surface-variant);">
                    <span class="material-icons" style="font-size: 64px; opacity: 0.3;">chat_bubble_outline</span>
                    <p>No messages</p>
                </div>
            `;
            return;
        }

        if (this.hasOlderMessages) {
            const hint = document.createElement('div');
            hint.className = 'older-messages-hint';
            hint.innerHTML = '<span class="material-icons">keyboard_double_arrow_up</span><span>Scroll up to load older messages</span>';
            container.appendChild(hint);
        }
        
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `message-item ${msg.is_mine ? 'my-message' : ''}`;
            
            if (msg.is_mine) {
                div.innerHTML = `
                    <div class="message-checkbox">
                        <input type="checkbox" data-msg-id="${msg.id}">
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-sender">You</span>
                            <span class="message-time">${this.formatTime(msg.timestamp)}</span>
                        </div>
                        <div class="message-text">${this.escapeHtml(msg.text || '(No text)')}</div>
                    </div>
                `;
                
                const checkbox = div.querySelector('input');
                checkbox.checked = this.selectedMessages.has(msg.id);
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.selectedMessages.add(msg.id);
                    } else {
                        this.selectedMessages.delete(msg.id);
                    }
                    this.updateUnsendButton();
                    this.updateMessagesCount();
                });
            } else {
                const reactionsHtml = this.renderMyReactions(msg);
                div.innerHTML = `
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-sender">${this.escapeHtml(msg.user_name || 'User')}</span>
                            <span class="message-time">${this.formatTime(msg.timestamp)}</span>
                        </div>
                        <div class="message-text">${this.escapeHtml(msg.text || '(No text)')}</div>
                        ${reactionsHtml}
                    </div>
                `;

                div.querySelectorAll('input[data-reaction-id]').forEach(checkbox => {
                    checkbox.checked = this.selectedMessages.has(checkbox.dataset.reactionId);
                    checkbox.addEventListener('change', (e) => {
                        const reactionId = e.target.dataset.reactionId;
                        if (e.target.checked) {
                            this.selectedMessages.add(reactionId);
                        } else {
                            this.selectedMessages.delete(reactionId);
                        }
                        this.updateUnsendButton();
                        this.updateMessagesCount();
                    });
                });
            }
            
            container.appendChild(div);
        });
        
        if (scrollToBottom) {
            container.scrollTop = container.scrollHeight;
        }
    }

    renderMyReactions(msg) {
        if (!msg.my_reactions || msg.my_reactions.length === 0) {
            return '';
        }

        const reactions = msg.my_reactions.map(reaction => {
            const emoji = reaction.emoji || '❤️';
            const reactionId = `reaction:${msg.id}:${emoji}`;
            const safeReactionId = this.escapeHtml(reactionId);
            return `
                <label class="reaction-select-pill" title="Select your reaction to remove">
                    <input type="checkbox" data-reaction-id="${safeReactionId}">
                    <span>${this.escapeHtml(emoji)}</span>
                    <small>Your reaction</small>
                </label>
            `;
        }).join('');

        return `<div class="my-reactions-row">${reactions}</div>`;
    }
    
    formatTime(timestamp) {
        if (!timestamp) return '';
        const normalizedTimestamp = typeof timestamp === 'string'
            ? Date.parse(timestamp)
            : timestamp * 1000;
        const date = new Date(normalizedTimestamp);
        if (Number.isNaN(date.getTime())) return '';
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 minute
        if (diff < 60000) return 'Just now';
        // Less than 1 hour
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        // Less than 24 hours
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        // Less than 7 days
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        // Format as date
        return date.toLocaleDateString();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    selectAllMyMessages() {
        const checkboxes = document.querySelectorAll('#messagesList input[type="checkbox"]');
        
        if (checkboxes.length === 0) {
            this.ui.showToast('No messages to select', 'info');
            return;
        }
        
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        // Clear selection first
        this.selectedMessages.clear();
        
        checkboxes.forEach(cb => {
            cb.checked = !allChecked;
            if (!allChecked) {
                // Get the message ID from the checkbox
                const msgId = cb.getAttribute('data-msg-id');
                if (msgId) {
                    this.selectedMessages.add(msgId);
                }
            }
        });
        
        this.updateUnsendButton();
        
        // Show feedback
        if (!allChecked) {
            this.ui.showToast(`Selected ${this.selectedMessages.size} messages`, 'success');
        } else {
            this.ui.showToast('Deselected all messages', 'info');
        }
    }
    
    updateUnsendButton() {
        const count = this.selectedMessages.size;
        this.ui.setButtonState('unsendBtn', count === 0 || Boolean(this.activeUnsendJobId), `Unsend Selected (${count})`);
        this.updateMessagesCount();
    }

    showJobPanel() {
        const panel = document.getElementById('unsendJobPanel');
        if (!panel) return;

        panel.hidden = false;
        panel.setAttribute('aria-hidden', 'false');
        panel.classList.remove('hidden');
    }

    hideJobPanel() {
        const panel = document.getElementById('unsendJobPanel');
        if (!panel) return;

        panel.hidden = true;
        panel.setAttribute('aria-hidden', 'true');
        panel.classList.add('hidden');
        document.getElementById('jobStatusText').textContent = '';
        document.getElementById('jobProgressText').textContent = '';
        document.getElementById('jobProgressBar').style.width = '0%';
        document.getElementById('jobProgressBar').classList.remove('is-active');
        document.getElementById('jobProgressTrack').setAttribute('aria-valuenow', '0');
        document.getElementById('jobFailedList').innerHTML = '';
    }

    renderJobProgress(job) {
        if (!job || !job.job_id) {
            this.hideJobPanel();
            return;
        }

        if (this.currentThread && job.thread_id && this.currentThread.thread_id !== job.thread_id) {
            this.hideJobPanel();
            return;
        }

        this.hasRenderedUnsendJob = true;
        this.showJobPanel();
        const percent = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
        const statusLabel = job.status.charAt(0).toUpperCase() + job.status.slice(1);
        const progressBar = document.getElementById('jobProgressBar');
        const progressTrack = document.getElementById('jobProgressTrack');

        document.getElementById('jobStatusText').textContent = `${statusLabel} unsend job`;
        document.getElementById('jobProgressText').textContent = `${percent}% · ${job.processed} / ${job.total} processed · ${job.unsent} unsent · ${job.failed} failed`;
        progressBar.style.width = `${percent}%`;
        progressBar.classList.toggle('is-active', ['queued', 'running'].includes(job.status));
        progressTrack.setAttribute('aria-valuenow', String(percent));
        document.getElementById('cancelJobBtn').disabled = !['queued', 'running'].includes(job.status);

        const failedList = document.getElementById('jobFailedList');
        if (job.failed_items && job.failed_items.length > 0) {
            failedList.innerHTML = `
                <strong>Failed items</strong>
                ${job.failed_items.slice(-20).map(item => `
                    <div class="job-failed-item">
                        <span>${this.escapeHtml(item.message_id || 'unknown')}</span>
                        <small>${this.escapeHtml(item.error || 'Unknown error')}</small>
                    </div>
                `).join('')}
            `;
        } else {
            failedList.innerHTML = '';
        }
    }

    startJobPolling(jobId, threadId = null) {
        this.stopJobPolling();
        this.activeUnsendJobId = jobId;
        this.activeUnsendJobThreadId = threadId || this.currentThread?.thread_id || null;
        this.updateUnsendButton();

        const poll = async () => {
            if (!this.activeUnsendJobId) return;

            try {
                const response = await this.api.getUnsendJob(this.activeUnsendJobId);
                const job = response.job;
                this.renderJobProgress(job);

                if (['completed', 'failed', 'cancelled'].includes(job.status)) {
                    const finishedJob = job;
                    this.stopJobPolling();
                    this.activeUnsendJobId = null;
                    this.activeUnsendJobThreadId = null;
                    this.selectedMessages.clear();
                    this.updateUnsendButton();
                    await this.openThread(this.currentThread, false, { preserveJobPanel: true });
                    this.renderJobProgress(finishedJob);
                    this.ui.showToast(`Unsend job ${finishedJob.status}: ${finishedJob.unsent} unsent, ${finishedJob.failed} failed`, finishedJob.failed > 0 ? 'error' : 'success');
                }
            } catch (error) {
                this.stopJobPolling();
                this.activeUnsendJobId = null;
                this.activeUnsendJobThreadId = null;
                this.updateUnsendButton();
                this.ui.showToast(`Failed to poll unsend job: ${error.message}`, 'error');
            }
        };

        poll();
        this.unsendJobPollTimer = setInterval(poll, 1500);
    }

    stopJobPolling() {
        if (this.unsendJobPollTimer) {
            clearInterval(this.unsendJobPollTimer);
            this.unsendJobPollTimer = null;
        }
    }

    async cancelActiveUnsendJob() {
        if (!this.activeUnsendJobId) return;

        try {
            const response = await this.api.cancelUnsendJob(this.activeUnsendJobId);
            this.renderJobProgress(response.job);
            this.ui.showToast('Cancel requested. Current item may finish first.', 'info');
        } catch (error) {
            this.ui.showToast(`Failed to cancel job: ${error.message}`, 'error');
        }
    }
    
    async handleUnsend() {
        if (this.selectedMessages.size === 0) return;
        
        const count = this.selectedMessages.size;
        if (!confirm(`Are you sure you want to unsend ${count} message${count > 1 ? 's' : ''}?`)) {
            return;
        }
        
        try {
            const response = await this.api.unsendMessages(
                this.currentThread.thread_id,
                Array.from(this.selectedMessages)
            );

            this.renderJobProgress(response.job);
            this.startJobPolling(response.job.job_id, response.job.thread_id);
            this.ui.showToast(`Unsend job started for ${response.job.total} item${response.job.total === 1 ? '' : 's'}`, 'success');
        } catch (error) {
            this.ui.showToast(`Failed to unsend messages: ${error.message}`, 'error');
        }
    }
    
    showThreadsView(updateUrl = true) {
        if (updateUrl) {
            this.navigate('/');
        }

        this.ui.showView('threadsView');
        this.selectedMessages.clear();
        this.closeTranscriptModal();
        if (!this.activeUnsendJobId) {
            this.hideJobPanel();
        }
        this.updateUnsendButton();
    }
    
    showMessagesView(title) {
        const titleElement = document.getElementById('threadTitle');
        titleElement.innerHTML = `
            <span class="material-icons">chat_bubble</span>
            <span>${this.escapeHtml(title)}</span>
        `;
        this.ui.showView('messagesView');
    }
    
    handleLogout() {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }
        
        localStorage.removeItem('sessionId');
        this.sessionId = null;
        this.isSessionValidated = false;
        this.currentThread = null;
        this.activeUnsendJobId = null;
        this.activeUnsendJobThreadId = null;
        this.hasRenderedUnsendJob = false;
        this.stopJobPolling();
        this.hideJobPanel();
        this.closeTranscriptModal();
        this.selectedMessages.clear();
        this.threads = null;
        this.allMessages = [];
        this.updateThreadsCount(0);
        this.updateMessagesCount();
        
        this.ui.clearInput('sessionId');
        this.navigate('/login', true);
        this.ui.showView('sessionView');
        this.ui.showToast('Logged out successfully', 'info');
    }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}
