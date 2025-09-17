class PWAApp {
    constructor() {
        this.init();
    }

    async init() {
        await this.registerServiceWorker();
        this.setupEventListeners();
        this.setupConnectionStatus();
        this.loadTodos();
        this.setupInstallPrompt();
        this.checkNotificationPermission();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('[App] SW registered:', registration);
                
                registration.addEventListener('updatefound', () => {
                    console.log('[App] SW update found');
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });
                
            } catch (error) {
                console.error('[App] SW registration failed:', error);
            }
        }
    }

    showUpdateNotification() {
        if (confirm('มีเวอร์ชันใหม่ของแอป คุณต้องการอัพเดทหรือไม่?')) {
            window.location.reload();
        }
    }

    setupEventListeners() {
        document.getElementById('enable-notifications').addEventListener('click', 
            () => this.enableNotifications());
        document.getElementById('send-notification').addEventListener('click', 
            () => this.sendTestNotification());
        
        document.getElementById('add-todo').addEventListener('click', 
            () => this.addTodo());
        document.getElementById('todo-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        
        document.getElementById('install-btn').addEventListener('click', 
            () => this.installApp());
    }

    setupConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        
        const updateConnectionStatus = () => {
            if (navigator.onLine) {
                statusElement.textContent = 'Online ✅';
                statusElement.className = 'status online';
            } else {
                statusElement.textContent = 'Offline ⚠️';
                statusElement.className = 'status offline';
            }
        };
        
        updateConnectionStatus();
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);
    }

    async enableNotifications() {
        if (!('Notification' in window)) {
            alert('เบราว์เซอร์นี้ไม่รองรับ Notifications');
            return;
        }

        let permission = Notification.permission;

        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        const statusElement = document.getElementById('notification-status');
        const sendButton = document.getElementById('send-notification');

        if (permission === 'granted') {
            statusElement.textContent = '✅ Notifications enabled!';
            statusElement.style.color = '#4CAF50';
            sendButton.disabled = false;
        } else {
            statusElement.textContent = '❌ Notifications blocked';
            statusElement.style.color = '#f44336';
        }
    }

    sendTestNotification() {
        if (Notification.permission === 'granted') {
            const options = {
                body: `ส่งเมื่อ: ${new Date().toLocaleTimeString('th-TH')}`,
                icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%23FF9800%22/><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22 fill=%22white%22>🚀</text></svg>",
                tag: 'test-notification',
                requireInteraction: false
            };

            const notification = new Notification('🚀 Test Notification', options);
            
            notification.addEventListener('click', () => {
                window.focus();
                notification.close();
            });

            setTimeout(() => notification.close(), 5000);
        }
    }

    addTodo() {
        const input = document.getElementById('todo-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        const todo = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        const todos = this.getTodos();
        todos.push(todo);
        this.saveTodos(todos);
        
        this.renderTodos();
        input.value = '';
        
        if (Notification.permission === 'granted') {
            new Notification('📝 เพิ่มรายการใหม่', {
                body: text,
                icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%234CAF50%22/><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22 fill=%22white%22>📝</text></svg>",
                tag: 'todo-added'
            });
        }
    }

    deleteTodo(id) {
        const todos = this.getTodos().filter(todo => todo.id !== id);
        this.saveTodos(todos);
        this.renderTodos();
    }

    toggleTodo(id) {
        const todos = this.getTodos().map(todo => 
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        this.saveTodos(todos);
        this.renderTodos();
    }

    getTodos() {
        try {
            return JSON.parse(localStorage.getItem('pwa-todos') || '[]');
        } catch (error) {
            console.error('Error loading todos:', error);
            return [];
        }
    }

    saveTodos(todos) {
        try {
            localStorage.setItem('pwa-todos', JSON.stringify(todos));
        } catch (error) {
            console.error('Error saving todos:', error);
        }
    }

    loadTodos() {
        this.renderTodos();
    }

    renderTodos() {
        const todoList = document.getElementById('todo-list');
        const todos = this.getTodos();
        
        if (todos.length === 0) {
            todoList.innerHTML = '<li class="empty">ไม่มีรายการ</li>';
            return;
        }
        
        todoList.innerHTML = todos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}">
                <span class="todo-text" onclick="app.toggleTodo(${todo.id})">
                    ${this.escapeHtml(todo.text)}
                </span>
                <button class="delete-btn" onclick="app.deleteTodo(${todo.id})" title="Delete">
                    🗑️
                </button>
            </li>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupInstallPrompt() {
        let deferredPrompt;
        const installCard = document.getElementById('install-card');
        const installBtn = document.getElementById('install-btn');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installCard.style.display = 'block';
        });

        window.addEventListener('appinstalled', () => {
            console.log('[App] PWA installed successfully');
            installCard.style.display = 'none';
            deferredPrompt = null;
            
            if (Notification.permission === 'granted') {
                new Notification('🎉 ติดตั้งแอปเรียบร้อย!', {
                    body: 'ตอนนี้คุณสามารถใช้งานแอปแบบ offline ได้แล้ว',
                    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%234CAF50%22/><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22 fill=%22white%22>🎉</text></svg>"
                });
            }
        });
    }

    async installApp() {
        // Install functionality is handled in setupInstallPrompt
    }

    checkNotificationPermission() {
        if (!('Notification' in window)) return;
        
        const statusElement = document.getElementById('notification-status');
        const enableButton = document.getElementById('enable-notifications');
        const sendButton = document.getElementById('send-notification');
        
        switch (Notification.permission) {
            case 'granted':
                statusElement.textContent = '✅ Notifications enabled!';
                statusElement.style.color = '#4CAF50';
                enableButton.textContent = 'Notifications Enabled';
                enableButton.disabled = true;
                sendButton.disabled = false;
                break;
            case 'denied':
                statusElement.textContent = '❌ Notifications blocked';
                statusElement.style.color = '#f44336';
                enableButton.textContent = 'Notifications Blocked';
                enableButton.disabled = true;
                break;
            default:
                statusElement.textContent = 'Click to enable notifications';
                statusElement.style.color = '#666';
        }
    }
}

// Initialize the app
const app = new PWAApp();
