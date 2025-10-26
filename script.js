// Global State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    notifBreaks: true,
    notifTasks: true,
    notifSounds: true
};
let timerState = {
    mode: 'work',
    timeLeft: settings.workDuration * 60,
    isRunning: false,
    interval: null,
    sessionsCompleted: 0
};
let stats = JSON.parse(localStorage.getItem('stats')) || {
    totalPomodoros: 0,
    totalTasks: 0,
    completedTasks: 0,
    focusHours: 0,
    weeklyData: [0, 0, 0, 0, 0, 0, 0]
};

// Authentication Functions
function showLogin() {
    closeAllModals();
    document.getElementById('loginModal').classList.add('active');
}

function showRegister() {
    closeAllModals();
    document.getElementById('registerModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function handleLogin(e) {
    e.preventDefault();
    closeModal('loginModal');
    showDashboard();
}

function handleRegister(e) {
    e.preventDefault();
    closeModal('registerModal');
    showDashboard();
}

function handleLogout() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('landingPage').style.display = 'block';
}

function showDashboard() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'grid';
    updateDashboard();
    renderTasks();
    updateStats();
    initializeWeekChart();
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
}

// Task Management
function showAddTaskModal() {
    document.getElementById('addTaskModal').classList.add('active');
}

function handleAddTask(e) {
    e.preventDefault();
    
    const task = {
        id: Date.now(),
        title: document.getElementById('taskTitle').value,
        category: document.getElementById('taskCategory').value,
        priority: document.getElementById('taskPriority').value,
        dueDate: document.getElementById('taskDueDate').value,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderTasks();
    updateDashboard();
    closeModal('addTaskModal');
    e.target.reset();
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const todayTasksList = document.getElementById('todayTasksList');
    
    tasksList.innerHTML = '';
    todayTasksList.innerHTML = '';
    
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No tasks found. Create your first task!</p>';
        return;
    }
    
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        tasksList.appendChild(taskElement);
    });
    
    // Render today's tasks in dashboard
    const todayTasks = tasks.filter(t => !t.completed).slice(0, 3);
    todayTasks.forEach(task => {
        const previewTask = document.createElement('div');
        previewTask.className = 'preview-task';
        previewTask.innerHTML = `
            <input type="checkbox" onchange="toggleTaskComplete(${task.id})">
            <span>${task.title}</span>
        `;
        todayTasksList.appendChild(previewTask);
    });
    
    if (todayTasks.length === 0) {
        todayTasksList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No pending tasks</p>';
    }
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    taskDiv.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
               onchange="toggleTaskComplete(${task.id})">
        <div class="task-content">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="task-badge ${task.category}">${task.category}</span>
                ${task.dueDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
            </div>
        </div>
        <div class="task-actions">
            <button class="task-action-btn" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return taskDiv;
}

function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        if (task.completed) {
            stats.completedTasks++;
            saveStats();
        } else {
            stats.completedTasks--;
            saveStats();
        }
        saveTasks();
        renderTasks();
        updateDashboard();
        updateStats();
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderTasks();
        updateDashboard();
    }
}

function filterTasks(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    currentFilter = filter;
    renderTasks();
}

let currentFilter = 'all';
let searchQuery = '';

function getFilteredTasks() {
    let filtered = tasks;
    
    if (currentFilter === 'pending') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }
    
    if (searchQuery) {
        filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    return filtered;
}

function searchTasks(query) {
    searchQuery = query;
    renderTasks();
}

// Timer Functions
function switchMode(mode) {
    if (timerState.isRunning) {
        pauseTimer();
    }
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    timerState.mode = mode;
    
    if (mode === 'work') {
        timerState.timeLeft = settings.workDuration * 60;
        document.getElementById('timerMode').textContent = 'Focus Time';
    } else if (mode === 'shortBreak') {
        timerState.timeLeft = settings.shortBreakDuration * 60;
        document.getElementById('timerMode').textContent = 'Short Break';
    } else {
        timerState.timeLeft = settings.longBreakDuration * 60;
        document.getElementById('timerMode').textContent = 'Long Break';
    }
    
    updateTimerDisplay();
    resetProgressCircle();
}

function startTimer() {
    timerState.isRunning = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-flex';
    
    timerState.interval = setInterval(() => {
        timerState.timeLeft--;
        updateTimerDisplay();
        updateProgressCircle();
        
        if (timerState.timeLeft <= 0) {
            completeTimer();
        }
    }, 1000);
}

function pauseTimer() {
    timerState.isRunning = false;
    clearInterval(timerState.interval);
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
}

function resetTimer() {
    pauseTimer();
    switchMode(timerState.mode);
}

function completeTimer() {
    pauseTimer();
    
    if (timerState.mode === 'work') {
        timerState.sessionsCompleted++;
        stats.totalPomodoros++;
        stats.focusHours += settings.workDuration / 60;
        
        // Update weekly data
        const today = new Date().getDay();
        stats.weeklyData[today]++;
        
        saveStats();
        updateDashboard();
        updateStats();
        
        if (settings.notifBreaks) {
            showNotification('Great work! Time for a break.');
        }
        
        // Auto switch to break
        if (timerState.sessionsCompleted % 4 === 0) {
            switchMode('longBreak');
        } else {
            switchMode('shortBreak');
        }
    } else {
        if (settings.notifBreaks) {
            showNotification('Break complete! Ready to focus?');
        }
        switchMode('work');
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerState.timeLeft / 60);
    const seconds = timerState.timeLeft % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('timerDisplay').textContent = display;
    document.getElementById('quickTimerDisplay').textContent = display;
    document.getElementById('sessionsToday').textContent = timerState.sessionsCompleted;
}

function updateProgressCircle() {
    const totalTime = timerState.mode === 'work' ? settings.workDuration * 60 :
                     timerState.mode === 'shortBreak' ? settings.shortBreakDuration * 60 :
                     settings.longBreakDuration * 60;
    
    const progress = timerState.timeLeft / totalTime;
    const circumference = 2 * Math.PI * 140;
    const offset = circumference * (1 - progress);
    
    document.getElementById('timerProgress').style.strokeDashoffset = offset;
}

function resetProgressCircle() {
    document.getElementById('timerProgress').style.strokeDashoffset = 0;
}

// Dashboard Updates
function updateDashboard() {
    stats.totalTasks = tasks.length;
    const completedCount = tasks.filter(t => t.completed).length;
    
    document.getElementById('totalTasks').textContent = stats.totalTasks;
    document.getElementById('completedTasks').textContent = completedCount;
    document.getElementById('totalPomodoros').textContent = stats.totalPomodoros;
    document.getElementById('focusHours').textContent = Math.round(stats.focusHours * 10) / 10;
}

function updateStats() {
    document.getElementById('statsCompleted').textContent = stats.completedTasks;
    document.getElementById('statsFocusTime').textContent = Math.round(stats.focusHours) + 'h';
    document.getElementById('statsStreak').textContent = calculateStreak();
    
    const productivityScore = stats.totalTasks > 0 ? 
        Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
    document.getElementById('statsScore').textContent = productivityScore + '%';
}

function calculateStreak() {
    // Simple streak calculation based on completed tasks
    return Math.min(stats.completedTasks, 30);
}

function initializeWeekChart() {
    const chartBars = document.getElementById('weekChart');
    chartBars.innerHTML = '';
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxValue = Math.max(...stats.weeklyData, 1);
    
    stats.weeklyData.forEach((value, index) => {
        const bar = document.createElement('div');
        const height = (value / maxValue) * 100;
        bar.className = 'chart-bar';
        bar.style.height = height + '%';
        bar.style.animationDelay = (index * 0.1) + 's';
        bar.innerHTML = `<span class="chart-label">${days[index]}</span>`;
        chartBars.appendChild(bar);
    });
}

// Settings
function saveSettings() {
    settings.workDuration = parseInt(document.getElementById('workDuration').value);
    settings.shortBreakDuration = parseInt(document.getElementById('shortBreakDuration').value);
    settings.longBreakDuration = parseInt(document.getElementById('longBreakDuration').value);
    settings.notifBreaks = document.getElementById('notifBreaks').checked;
    settings.notifTasks = document.getElementById('notifTasks').checked;
    settings.notifSounds = document.getElementById('notifSounds').checked;
    
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Update timer if not running
    if (!timerState.isRunning) {
        switchMode(timerState.mode);
    }
}

function loadSettings() {
    document.getElementById('workDuration').value = settings.workDuration;
    document.getElementById('shortBreakDuration').value = settings.shortBreakDuration;
    document.getElementById('longBreakDuration').value = settings.longBreakDuration;
    document.getElementById('notifBreaks').checked = settings.notifBreaks;
    document.getElementById('notifTasks').checked = settings.notifTasks;
    document.getElementById('notifSounds').checked = settings.notifSounds;
}

// Utilities
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus Flow', {
            body: message,
            icon: '🧠'
        });
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function saveStats() {
    localStorage.setItem('stats', JSON.stringify(stats));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateTimerDisplay();
    resetProgressCircle();
    requestNotificationPermission();
    
    // Add SVG gradient for timer circle
    const svg = document.querySelector('.timer-svg');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'gradient');
    gradient.innerHTML = `
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    `;
    defs.appendChild(gradient);
    svg.appendChild(defs);
});

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
