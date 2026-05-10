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

        document.getElementById('messagesList')
            .addEventListener('scroll', () => this.handleMessagesScroll());
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
    
    async openThread(thread, updateUrl = true) {
        if (updateUrl) {
            this.navigate(`/${encodeURIComponent(thread.thread_id)}`);
        }

        this.currentThread = thread;
        this.selectedMessages.clear();
        this.allMessages = [];
        this.nextMessagesCursor = null;
        this.hasOlderMessages = false;
        this.isLoadingOlderMessages = false;
        this.isLoadingAllMessages = false;
        this.updateLoadAllButton();
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
        this.ui.setButtonState('unsendBtn', count === 0, `Unsend Selected (${count})`);
        this.updateMessagesCount();
    }
    
    async handleUnsend() {
        if (this.selectedMessages.size === 0) return;
        
        const count = this.selectedMessages.size;
        if (!confirm(`Are you sure you want to unsend ${count} message${count > 1 ? 's' : ''}?`)) {
            return;
        }
        
        this.ui.showLoader();
        
        try {
            const response = await this.api.unsendMessages(
                this.currentThread.thread_id,
                Array.from(this.selectedMessages)
            );
            
            this.ui.showToast(
                `Successfully unsent ${response.unsent} message${response.unsent > 1 ? 's' : ''}`,
                'success'
            );
            
            if (response.failed > 0) {
                this.ui.showToast(
                    `Failed to unsend ${response.failed} message${response.failed > 1 ? 's' : ''}`,
                    'error'
                );
            }
            
            // Reload messages
            this.selectedMessages.clear();
            await this.openThread(this.currentThread);
        } catch (error) {
            this.ui.showToast(`Failed to unsend messages: ${error.message}`, 'error');
        } finally {
            this.ui.hideLoader();
        }
    }
    
    showThreadsView(updateUrl = true) {
        if (updateUrl) {
            this.navigate('/');
        }

        this.ui.showView('threadsView');
        this.selectedMessages.clear();
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
