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
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-light);">No conversations found</div>';
            return;
        }
        
        threads.forEach(thread => {
            const div = document.createElement('div');
            div.className = 'thread-item';
            
            const profilePic = thread.users[0]?.profile_pic_url || '';
            const title = thread.thread_title || 'Unknown';
            const preview = thread.last_message || 'No messages';
            
            div.innerHTML = `
                <img src="${profilePic}" alt="${title}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2256%22 height=%2256%22%3E%3Crect fill=%22%23ddd%22 width=%2256%22 height=%2256%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2224%22 fill=%22%23999%22%3E${title[0]?.toUpperCase() || '?'}%3C/text%3E%3C/svg%3E'">
                <div class="thread-info">
                    <div class="thread-title">${title}</div>
                    <div class="thread-preview">${preview}</div>
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
        this.ui.showLoader();
        
        try {
            const response = await this.api.getMessages(thread.thread_id);
            this.allMessages = response.messages;
            this.renderMessages(response.messages);
            this.showMessagesView(thread.thread_title);
        } catch (error) {
            this.ui.showToast('Failed to load messages', 'error');
        } finally {
            this.ui.hideLoader();
        }
    }
    
    renderMessages(messages) {
        const container = document.getElementById('messagesList');
        container.innerHTML = '';
        
        if (messages.length === 0) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-light);">No messages</div>';
            return;
        }
        
        // Reverse to show oldest first
        messages.reverse().forEach(msg => {
            const div = document.createElement('div');
            div.className = `message ${msg.is_mine ? 'mine' : 'theirs'}`;
            
            if (msg.is_mine) {
                div.innerHTML = `
                    <input type="checkbox" data-msg-id="${msg.id}">
                    <div class="message-content">${this.escapeHtml(msg.text || '(No text)')}</div>
                `;
                
                const checkbox = div.querySelector('input');
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
                    <div class="message-content">${this.escapeHtml(msg.text || '(No text)')}</div>
                `;
            }
            
            container.appendChild(div);
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
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
        document.getElementById('threadTitle').textContent = title;
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