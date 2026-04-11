export class UI {
    showLoader() {
        document.getElementById('loader').classList.remove('hidden');
    }

    hideLoader() {
        document.getElementById('loader').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showView(viewId) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(viewId).classList.remove('hidden');
    }

    clearInput(inputId) {
        document.getElementById(inputId).value = '';
    }

    setButtonState(buttonId, disabled, text) {
        const button = document.getElementById(buttonId);
        button.disabled = disabled;
        if (text) button.textContent = text;
    }
}