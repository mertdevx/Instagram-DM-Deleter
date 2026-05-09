import { API } from './api.js';
import { UI } from './ui.js';

class App {
    constructor() {
        this.api = new API('http://localhost:8000');
        this.ui = new UI();
        this.sessionId = localStorage.getItem('sessionId') || null;
        this.currentThread = null;
        this.selectedMessages = new Set();
        this.allMessages = [];
        this.nextMessagesCursor = null;
        this.hasOlderMessages = false;
        this.isLoadingOlderMessages = false;
        
        this.init();
        this.checkExistingSession();
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
        } catch (error) {
            this.ui.showToast('Failed to load conversations', 'error');
        } finally {
            this.ui.hideLoader();
        }
    }
    
    renderThreads(threads) {
        const container = document.getElementById('threadsList');
        container.innerHTML = '';
        
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
    
    async openThread(thread) {
        this.currentThread = thread;
        this.selectedMessages.clear();
        this.allMessages = [];
        this.nextMessagesCursor = null;
        this.hasOlderMessages = false;
        this.isLoadingOlderMessages = false;
        this.ui.showLoader();
        
        try {
            const response = await this.api.getMessages(thread.thread_id);
            this.allMessages = this.normalizeMessages(response.messages);
            this.nextMessagesCursor = response.next_cursor || null;
            this.hasOlderMessages = Boolean(response.has_older && this.nextMessagesCursor);
            this.showMessagesView(thread.thread_title);
            this.renderMessages(this.allMessages, { scrollToBottom: true });
        } catch (error) {
            this.ui.showToast('Failed to load messages', 'error');
        } finally {
            this.ui.hideLoader();
        }
    }
    
    async handleMessagesScroll() {
        const container = document.getElementById('messagesList');

        if (
            container.scrollTop > 80 ||
            !this.currentThread ||
            !this.hasOlderMessages ||
            !this.nextMessagesCursor ||
            this.isLoadingOlderMessages
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

            container.scrollTop = container.scrollHeight - previousScrollHeight;
        } catch (error) {
            this.ui.showToast(`Failed to load older messages: ${error.message}`, 'error');
        } finally {
            this.isLoadingOlderMessages = false;
        }
    }

    normalizeMessages(messages) {
        return [...messages].reverse();
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
                });
            } else {
                div.innerHTML = `
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-sender">${this.escapeHtml(msg.user_name || 'User')}</span>
                            <span class="message-time">${this.formatTime(msg.timestamp)}</span>
                        </div>
                        <div class="message-text">${this.escapeHtml(msg.text || '(No text)')}</div>
                    </div>
                `;
            }
            
            container.appendChild(div);
        });
        
        if (scrollToBottom) {
            container.scrollTop = container.scrollHeight;
        }
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
    
    showThreadsView() {
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
        this.currentThread = null;
        this.selectedMessages.clear();
        this.threads = null;
        this.allMessages = [];
        
        this.ui.clearInput('sessionId');
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
