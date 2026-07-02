const STORAGE_KEY = 'todo-app-focusflow';
let tasks = [];
let activeFilter = 'all';
let activeDateFilter = 'all';
let searchQuery = '';
let sortOrder = 'custom';
const priorityWeight = { High: 3, Medium: 2, Low: 1 };

// Selection state for bulk actions
let selectedTaskIds = new Set();

// Pomodoro Timer State
let timerInterval = null;
let timeLeft = 1500; // 25 minutes default
let totalDuration = 1500;
let timerRunning = false;
let currentTimerMode = 'pomodoro';
let pomodorosCompleted = 0;

// Elements references
const newTaskInput = document.getElementById('newTaskInput');
const descriptionInput = document.getElementById('descriptionInput');
const categoryInput = document.getElementById('categoryInput');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const addTaskButton = document.getElementById('addTaskButton');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const taskList = document.getElementById('taskList');
const taskSummary = document.getElementById('taskSummary');
const taskCount = document.getElementById('taskCount');
const filterButtons = document.querySelectorAll('.filter-button');
const dateFilterButtons = document.querySelectorAll('.date-filter');
const clearCompletedButton = document.getElementById('clearCompleted');
const completeAllButton = document.getElementById('completeAll');
const clearAllButton = document.getElementById('clearAll');
const clearOverdueButton = document.getElementById('clearOverdue');
const themeToggle = document.getElementById('themeToggle');
const exportTasksButton = document.getElementById('exportTasks');
const importTasksButton = document.getElementById('importTasks');
const importFileInput = document.getElementById('importFileInput');
const selectAllBtn = document.getElementById('selectAllBtn');

// AI Generator Elements
const aiSituationInput = document.getElementById('aiSituationInput');
const generateAiTasksBtn = document.getElementById('generateAiTasksBtn');
const aiStatusMessage = document.getElementById('aiStatusMessage');

// View Switcher Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const appViews = document.querySelectorAll('.app-view');

// Timer Elements
const timerCountdown = document.getElementById('timerCountdown');
const timerProgress = document.getElementById('timerProgress');
const startTimerBtn = document.getElementById('startTimerBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');
const focusTaskSelect = document.getElementById('focusTaskSelect');
const pomodorosCompletedCount = document.getElementById('pomodorosCompletedCount');
const modeButtons = document.querySelectorAll('.mode-btn');
const successSound = document.getElementById('successSound');

// Dashboard Elements
const statTotalTasks = document.getElementById('statTotalTasks');
const statCompletedTasks = document.getElementById('statCompletedTasks');
const statActiveTasks = document.getElementById('statActiveTasks');
const statOverdueTasks = document.getElementById('statOverdueTasks');
const dashboardProgressFill = document.getElementById('dashboardProgressFill');
const dashboardProgressText = document.getElementById('dashboardProgressText');
const dashboardInsightsText = document.getElementById('dashboardInsightsText');

// AI Chat Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const suggestButtons = document.querySelectorAll('.suggest-btn');

// Bulk Bar elements
const bulkBar = document.getElementById('bulkBar');
const bulkCount = document.getElementById('bulkCount');
const bulkCompleteBtn = document.getElementById('bulkCompleteBtn');
const bulkPriorityBtn = document.getElementById('bulkPriorityBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

// ==========================================
// 1. DATA ACCESS & SYNC
// ==========================================

async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
            tasks = await response.json();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } else {
            throw new Error('API server returned error');
        }
    } catch (e) {
        console.warn('Failed to load tasks from Java server, using localStorage fallback:', e);
        tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }
    
    // Safety check on task elements
    tasks = tasks.map(task => ({
        ...task,
        subtasks: task.subtasks || [],
        focusSessions: task.focusSessions || 0
    }));

    renderTasks();
    populateFocusTaskSelector();
    updateDashboardStats();
}

async function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    try {
        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(tasks)
        });
    } catch (e) {
        console.error('Failed to sync tasks with Java server:', e);
    }
    populateFocusTaskSelector();
    updateDashboardStats();
}

// ==========================================
// 2. VIEW SWITCHING
// ==========================================

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        
        tabButtons.forEach(b => b.classList.toggle('active', b === btn));
        appViews.forEach(v => v.classList.toggle('active', v.id === viewId));

        if (viewId === 'dashboard-view') {
            updateDashboardStats();
        } else if (viewId === 'focus-view') {
            populateFocusTaskSelector();
        }
    });
});

// ==========================================
// 3. TASK RENDERING & CRUD
// ==========================================

function formatDueDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(`${dateString}T00:00:00`);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return dateString;
    }
}

function createTaskItem(task) {
    const item = document.createElement('li');
    item.className = 'task-item';
    item.dataset.id = task.id;
    if (task.completed) item.classList.add('completed');

    // Main Row containing Checkbox, Text, Meta and Buttons
    const mainRow = document.createElement('div');
    mainRow.className = 'task-main-row';

    // Bulk selection checkbox
    const selectBox = document.createElement('input');
    selectBox.type = 'checkbox';
    selectBox.className = 'bulk-checkbox';
    selectBox.style.marginRight = '8px';
    selectBox.style.alignSelf = 'center';
    selectBox.checked = selectedTaskIds.has(task.id);
    selectBox.addEventListener('change', (e) => {
        if (e.target.checked) {
            selectedTaskIds.add(task.id);
        } else {
            selectedTaskIds.delete(task.id);
        }
        updateBulkBar();
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const checkContainer = document.createElement('div');
    checkContainer.className = 'task-checkbox-container';
    checkContainer.append(checkbox);

    const contentBlock = document.createElement('div');
    contentBlock.className = 'task-content-block';

    const label = document.createElement('p');
    label.className = 'task-label';
    label.textContent = task.text;
    label.addEventListener('click', () => {
        // Toggle subtask section expand
        const subSec = item.querySelector('.subtasks-container');
        if (subSec) {
            subSec.style.display = subSec.style.display === 'none' ? 'flex' : 'none';
        }
    });
    contentBlock.appendChild(label);

    if (task.description) {
        const desc = document.createElement('p');
        desc.className = 'task-description';
        desc.textContent = task.description;
        contentBlock.appendChild(desc);
    }

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    if (task.category) {
        const catBadge = document.createElement('span');
        catBadge.className = 'badge badge-category';
        catBadge.textContent = task.category;
        meta.appendChild(catBadge);
    }

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge-${task.priority.toLowerCase()}`;
    priorityBadge.textContent = task.priority;
    meta.appendChild(priorityBadge);

    if (task.dueDate) {
        const dueBadge = document.createElement('span');
        dueBadge.className = 'badge badge-due';
        
        // Highlight overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        
        if (taskDate < today && !task.completed) {
            dueBadge.className = 'badge badge-high';
            dueBadge.textContent = `Overdue! ${formatDueDate(task.dueDate)}`;
        } else {
            dueBadge.textContent = `Due ${formatDueDate(task.dueDate)}`;
        }
        meta.appendChild(dueBadge);
    }

    if (task.focusSessions > 0) {
        const focusBadge = document.createElement('span');
        focusBadge.className = 'badge badge-due';
        focusBadge.textContent = `⏱️ ${task.focusSessions} Focus Block${task.focusSessions === 1 ? '' : 's'}`;
        meta.appendChild(focusBadge);
    }

    contentBlock.appendChild(meta);

    const buttons = document.createElement('div');
    buttons.className = 'task-buttons';

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => editTask(task.id));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'danger';
    deleteButton.addEventListener('click', () => deleteTask(task.id));

    buttons.append(editButton, deleteButton);
    mainRow.append(selectBox, checkContainer, contentBlock, buttons);
    item.appendChild(mainRow);

    // ==========================================
    // Subtask Checklist UI Section
    // ==========================================
    const subtasksContainer = document.createElement('div');
    subtasksContainer.className = 'subtasks-container';
    subtasksContainer.style.display = 'none'; // hidden by default, expands on title click

    const subtasksHeader = document.createElement('div');
    subtasksHeader.className = 'subtasks-header';
    
    const subtasksTitle = document.createElement('span');
    subtasksTitle.textContent = '📋 Checklist Subtasks';
    subtasksHeader.appendChild(subtasksTitle);

    // Progress Bar
    const progressDiv = document.createElement('div');
    progressDiv.className = 'subtask-progress';
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    bar.appendChild(fill);
    const progressText = document.createElement('span');
    progressText.className = 'progress-text';
    progressText.textContent = '0%';
    progressDiv.append(bar, progressText);
    subtasksHeader.appendChild(progressDiv);
    
    subtasksContainer.appendChild(subtasksHeader);

    // Subtask List
    const subList = document.createElement('ul');
    subList.className = 'subtask-list';
    
    const subtasks = task.subtasks || [];
    let completedCount = 0;

    subtasks.forEach(sub => {
        if (sub.completed) completedCount++;

        const subItem = document.createElement('li');
        subItem.className = 'subtask-item';
        if (sub.completed) subItem.classList.add('completed');

        const leftBlock = document.createElement('div');
        leftBlock.className = 'subtask-item-left';

        const subCheck = document.createElement('input');
        subCheck.type = 'checkbox';
        subCheck.checked = sub.completed;
        subCheck.addEventListener('change', () => toggleSubtask(task.id, sub.id));

        const subSpan = document.createElement('span');
        subSpan.textContent = sub.text;

        leftBlock.append(subCheck, subSpan);

        const subDel = document.createElement('button');
        subDel.className = 'subtask-del-btn';
        subDel.textContent = '✖';
        subDel.addEventListener('click', () => deleteSubtask(task.id, sub.id));

        subItem.append(leftBlock, subDel);
        subList.appendChild(subItem);
    });

    // Update subtask progress UI
    if (subtasks.length > 0) {
        const pct = Math.round((completedCount / subtasks.length) * 100);
        fill.style.width = `${pct}%`;
        progressText.textContent = `${pct}%`;
    } else {
        fill.style.width = '0%';
        progressText.textContent = '0%';
    }

    subtasksContainer.appendChild(subList);

    // Add subtask input row
    const inputRow = document.createElement('div');
    inputRow.className = 'subtask-input-row';
    const subInput = document.createElement('input');
    subInput.type = 'text';
    subInput.placeholder = 'Add new checklist step...';
    subInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSubtask(task.id, subInput.value.trim());
        }
    });

    const addSubBtn = document.createElement('button');
    addSubBtn.textContent = 'Add Step';
    addSubBtn.addEventListener('click', () => {
        addSubtask(task.id, subInput.value.trim());
    });

    inputRow.append(subInput, addSubBtn);
    subtasksContainer.appendChild(inputRow);
    item.appendChild(subtasksContainer);

    return item;
}

function applyFilters(tasksList) {
    return tasksList.filter((task) => {
        const filterMatch = activeFilter === 'all'
            || (activeFilter === 'active' && !task.completed)
            || (activeFilter === 'completed' && task.completed);
        
        const query = searchQuery.toLowerCase();
        const textMatch = task.text.toLowerCase().includes(query)
            || (task.description && task.description.toLowerCase().includes(query))
            || (task.category && task.category.toLowerCase().includes(query));
        
        let dateMatch = true;
        if (task.dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            
            const oneWeekFromToday = new Date(today);
            oneWeekFromToday.setDate(today.getDate() + 7);
            
            if (activeDateFilter === 'today') {
                dateMatch = taskDate.getTime() === today.getTime();
            } else if (activeDateFilter === 'week') {
                dateMatch = taskDate >= today && taskDate <= oneWeekFromToday;
            } else if (activeDateFilter === 'overdue') {
                dateMatch = taskDate < today && !task.completed;
            }
        } else {
            if (activeDateFilter !== 'all') {
                dateMatch = false; 
            }
        }
        
        return filterMatch && textMatch && dateMatch;
    });
}

function applySort(tasksList) {
    const sorted = [...tasksList];
    if (sortOrder === 'custom') {
        return sorted; // original order
    }
    sorted.sort((a, b) => {
        if (sortOrder === 'oldest') {
            return new Date(a.createdAt) - new Date(b.createdAt);
        }
        if (sortOrder === 'due') {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (sortOrder === 'priority') {
            return priorityWeight[b.priority] - priorityWeight[a.priority] || new Date(a.createdAt) - new Date(b.createdAt);
        }
        return new Date(b.createdAt) - new Date(a.createdAt); // default newest
    });
    return sorted;
}

function renderTasks() {
    taskList.innerHTML = '';
    let visibleTasks = applyFilters(tasks);
    visibleTasks = applySort(visibleTasks);

    if (visibleTasks.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = searchQuery ? 'No tasks match your search.' : 'No tasks to show.';
        empty.className = 'empty-state';
        taskList.appendChild(empty);
    } else {
        visibleTasks.forEach((task) => taskList.appendChild(createTaskItem(task)));
    }

    filterButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.filter === activeFilter);
    });
    dateFilterButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.dateFilter === activeDateFilter);
    });
    
    // Update simple header labels
    const total = tasks.length;
    const active = tasks.filter(t => !t.completed).length;
    taskSummary.textContent = `${total} total • ${active} active`;
    taskCount.textContent = `${active} task${active === 1 ? '' : 's'} left`;
    completeAllButton.textContent = tasks.some(t => !t.completed) ? 'Complete All' : 'Mark Active';

    updateBulkBar();
}

function addTask() {
    const text = newTaskInput.value.trim();
    if (!text) return;

    tasks.push({
        id: Date.now() + Math.random(),
        text,
        description: descriptionInput.value.trim(),
        category: categoryInput.value.trim(),
        completed: false,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value || '',
        createdAt: new Date().toISOString(),
        subtasks: [],
        focusSessions: 0
    });

    newTaskInput.value = '';
    descriptionInput.value = '';
    categoryInput.value = '';
    dueDateInput.value = '';
    prioritySelect.value = 'Medium';
    saveTasks();
    renderTasks();
}

function toggleTask(id) {
    tasks = tasks.map((task) => {
        if (task.id === id) {
            const nextCompleted = !task.completed;
            // Automatically complete all subtasks if task is completed
            const nextSubtasks = task.subtasks.map(sub => ({
                ...sub,
                completed: nextCompleted
            }));
            return { ...task, completed: nextCompleted, subtasks: nextSubtasks };
        }
        return task;
    });
    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    selectedTaskIds.delete(id);
    saveTasks();
    renderTasks();
}

function editTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    const newText = prompt('Edit task text:', task.text);
    if (newText === null) return;
    const trimmedText = newText.trim();
    if (!trimmedText) return;

    const newDesc = prompt('Edit description (optional):', task.description || '');
    if (newDesc === null) return;

    const newCat = prompt('Edit category (optional):', task.category || '');
    if (newCat === null) return;

    tasks = tasks.map((item) => item.id === id ? { 
        ...item, 
        text: trimmedText, 
        description: newDesc.trim(), 
        category: newCat.trim() 
    } : item);
    saveTasks();
    renderTasks();
}

// Subtasks interactions
function addSubtask(taskId, subText) {
    if (!subText) return;
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            const nextSubtasks = [...task.subtasks, {
                id: Date.now() + Math.random(),
                text: subText,
                completed: false
            }];
            return { ...task, subtasks: nextSubtasks, completed: false }; // untoggle completion if adding subtask
        }
        return task;
    });
    saveTasks();
    renderTasks();
    
    // Automatically re-expand the modified task
    const item = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (item) {
        const subSec = item.querySelector('.subtasks-container');
        if (subSec) subSec.style.display = 'flex';
    }
}

function toggleSubtask(taskId, subId) {
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            const nextSubtasks = task.subtasks.map(sub => 
                sub.id === subId ? { ...sub, completed: !sub.completed } : sub
            );
            
            // If all subtasks are complete, check the parent task!
            const allComplete = nextSubtasks.length > 0 && nextSubtasks.every(s => s.completed);
            
            return { 
                ...task, 
                subtasks: nextSubtasks,
                completed: allComplete ? true : task.completed 
            };
        }
        return task;
    });
    saveTasks();
    renderTasks();

    const item = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (item) {
        const subSec = item.querySelector('.subtasks-container');
        if (subSec) subSec.style.display = 'flex';
    }
}

function deleteSubtask(taskId, subId) {
    tasks = tasks.map(task => {
        if (task.id === taskId) {
            const nextSubtasks = task.subtasks.filter(sub => sub.id !== subId);
            return { ...task, subtasks: nextSubtasks };
        }
        return task;
    });
    saveTasks();
    renderTasks();

    const item = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (item) {
        const subSec = item.querySelector('.subtasks-container');
        if (subSec) subSec.style.display = 'flex';
    }
}

// Clear and general bulk
function clearCompletedTasks() {
    tasks = tasks.filter((task) => !task.completed);
    selectedTaskIds.clear();
    saveTasks();
    renderTasks();
}

function clearOverdueTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks = tasks.filter((task) => {
        if (!task.dueDate) return true;
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        const isOverdue = taskDate < today && !task.completed;
        return !isOverdue;
    });
    saveTasks();
    renderTasks();
}

function clearAllTasks() {
    if (!confirm('Remove all tasks?')) return;
    tasks = [];
    selectedTaskIds.clear();
    saveTasks();
    renderTasks();
}

function toggleAllTasks() {
    const hasIncomplete = tasks.some((task) => !task.completed);
    tasks = tasks.map((task) => ({ 
        ...task, 
        completed: hasIncomplete,
        subtasks: task.subtasks.map(sub => ({ ...sub, completed: hasIncomplete }))
    }));
    saveTasks();
    renderTasks();
}

// Bulk Selection Management
function updateBulkBar() {
    if (selectedTaskIds.size > 0) {
        bulkBar.style.display = 'flex';
        bulkCount.textContent = `${selectedTaskIds.size} task${selectedTaskIds.size === 1 ? '' : 's'} selected`;
    } else {
        bulkBar.style.display = 'none';
    }
}

selectAllBtn.addEventListener('click', () => {
    const visible = applyFilters(tasks);
    const allSelected = visible.every(t => selectedTaskIds.has(t.id));

    if (allSelected) {
        visible.forEach(t => selectedTaskIds.delete(t.id));
    } else {
        visible.forEach(t => selectedTaskIds.add(t.id));
    }
    
    // Rerender check states
    renderTasks();
});

bulkCompleteBtn.addEventListener('click', () => {
    tasks = tasks.map(t => {
        if (selectedTaskIds.has(t.id)) {
            const nextCompleted = !t.completed;
            return {
                ...t,
                completed: nextCompleted,
                subtasks: t.subtasks.map(sub => ({ ...sub, completed: nextCompleted }))
            };
        }
        return t;
    });
    saveTasks();
    renderTasks();
});

bulkPriorityBtn.addEventListener('click', () => {
    tasks = tasks.map(t => {
        if (selectedTaskIds.has(t.id)) {
            return { ...t, priority: 'High' };
        }
        return t;
    });
    saveTasks();
    renderTasks();
});

bulkDeleteBtn.addEventListener('click', () => {
    if (!confirm(`Delete ${selectedTaskIds.size} selected tasks?`)) return;
    tasks = tasks.filter(t => !selectedTaskIds.has(t.id));
    selectedTaskIds.clear();
    saveTasks();
    renderTasks();
});


// ==========================================
// 4. POMODORO TIMER CORE
// ==========================================

function populateFocusTaskSelector() {
    const select = document.getElementById('focusTaskSelect');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- No Linked Task (General Focus) --</option>';
    
    tasks.filter(t => !t.completed).forEach(task => {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = `${task.text} [${task.priority}]`;
        select.appendChild(option);
    });

    if (currentVal && tasks.some(t => t.id == currentVal && !t.completed)) {
        select.value = currentVal;
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerCountdown.textContent = timeStr;

    // SVG Circular Ring Progress
    const radius = 95;
    const circumference = 2 * Math.PI * radius; // ~596.9
    const offset = circumference - (circumference * timeLeft) / totalDuration;
    timerProgress.style.strokeDashoffset = offset;
}

function startTimer() {
    if (timerRunning) {
        clearInterval(timerInterval);
        startTimerBtn.textContent = 'Resume Session';
        timerRunning = false;
    } else {
        timerRunning = true;
        startTimerBtn.textContent = 'Pause Timer';
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                handleTimerComplete();
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timeLeft = totalDuration;
    startTimerBtn.textContent = 'Start Session';
    updateTimerDisplay();
}

function handleTimerComplete() {
    clearInterval(timerInterval);
    timerRunning = false;
    startTimerBtn.textContent = 'Start Session';

    // Play visual & sound notification
    try {
        successSound.currentTime = 0;
        successSound.play();
    } catch (e) {
        console.warn('Audio play failed:', e);
    }

    if (currentTimerMode === 'pomodoro' || currentTimerMode === 'demo') {
        pomodorosCompleted++;
        pomodorosCompletedCount.textContent = pomodorosCompleted;
        
        // Check linked task increment focus count
        const linkedTaskId = focusTaskSelect.value;
        if (linkedTaskId) {
            tasks = tasks.map(task => {
                if (task.id == linkedTaskId) {
                    const focusCount = (task.focusSessions || 0) + 1;
                    return { ...task, focusSessions: focusCount };
                }
                return task;
            });
            saveTasks();
            renderTasks();
            alert('Great work! Your Pomodoro focus block is complete. Focus block logged under your selected task.');
        } else {
            alert('Great work! Your Pomodoro focus block is complete.');
        }

        // Suggest short break
        switchTimerMode(300, 'short-break');
    } else {
        alert('Break interval finished. Ready to focus again?');
        switchTimerMode(1500, 'pomodoro');
    }
}

function switchTimerMode(duration, mode) {
    currentTimerMode = mode;
    totalDuration = duration;
    timeLeft = duration;
    
    modeButtons.forEach(btn => {
        const isMatch = btn.dataset.mode === mode;
        btn.classList.toggle('active', isMatch);
    });

    resetTimer();
}

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const seconds = parseInt(btn.dataset.time);
        const mode = btn.dataset.mode;
        switchTimerMode(seconds, mode);
    });
});

startTimerBtn.addEventListener('click', startTimer);
resetTimerBtn.addEventListener('click', resetTimer);


// ==========================================
// 5. INTERACTIVE ANALYTICS DASHBOARD
// ==========================================

async function updateDashboardStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const stats = await response.json();

        // Populate metric values
        statTotalTasks.textContent = stats.total;
        statCompletedTasks.textContent = stats.completed;
        statActiveTasks.textContent = stats.active;
        statOverdueTasks.textContent = stats.overdue;

        // Populate linear completion progress bar
        const pct = Math.round(stats.completionPercentage);
        dashboardProgressFill.style.width = `${pct}%`;
        dashboardProgressText.textContent = `${pct}% Complete`;

        // Insights recommendation text
        let advice = "";
        if (stats.total === 0) {
            advice = "Your task list is empty. Add a few tasks to begin tracking your analytics.";
        } else if (stats.overdue > 0) {
            advice = `⚠️ Priority Action Needed: You have ${stats.overdue} overdue task${stats.overdue === 1 ? '' : 's'}! Focus on finishing overdue High priority items first.`;
        } else if (pct === 100) {
            advice = "✨ Exceptional job! All your tasks are completed. Start planning your next project.";
        } else if (pct > 70) {
            advice = "🚀 You are in the flow! Keep tracking toward a fully cleared checklist.";
        } else {
            advice = "💡 Pro Tip: Leverage the Pomodoro Focus Timer to tackle your active items one block at a time.";
        }
        dashboardInsightsText.textContent = advice;

        // Custom canvas graphics
        drawCategoryChart(stats.categories);
        drawPriorityChart(stats.priorities);

    } catch (e) {
        console.error('Failed to load dashboard metrics:', e);
    }
}

function drawCategoryChart(categoriesData) {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const categories = Object.keys(categoriesData || {});
    if (categories.length === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('No category data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    const maxVal = Math.max(...Object.values(categoriesData), 1);
    const startX = 85;
    const startY = 20;
    const chartWidth = canvas.width - startX - 30;
    const chartHeight = canvas.height - 40;
    const barHeight = Math.min(22, chartHeight / (categories.length * 1.5));
    const gap = barHeight * 0.8;

    categories.forEach((cat, index) => {
        const val = categoriesData[cat];
        const y = startY + index * (barHeight + gap);
        const w = (val / maxVal) * chartWidth;

        // Label
        ctx.fillStyle = document.body.classList.contains('dark-theme') ? '#f8fafc' : '#0f172a';
        ctx.font = '500 12px Outfit';
        ctx.textAlign = 'right';
        ctx.fillText(cat.length > 11 ? cat.substring(0, 9) + '..' : cat, startX - 10, y + barHeight / 1.5);

        // Rounded Bar
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(startX, y, w || 2, barHeight, 5);
            ctx.fill();
        } else {
            ctx.fillRect(startX, y, w || 2, barHeight);
        }

        // Value inside/beside bar
        ctx.fillStyle = w > 20 ? '#ffffff' : (document.body.classList.contains('dark-theme') ? '#f8fafc' : '#0f172a');
        ctx.font = '600 10px Outfit';
        ctx.textAlign = w > 20 ? 'right' : 'left';
        const textX = w > 20 ? startX + w - 6 : startX + w + 5;
        ctx.fillText(val, textX, y + barHeight / 1.5);
    });
}

function drawPriorityChart(prioritiesData) {
    const canvas = document.getElementById('priorityChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const priorities = ['High', 'Medium', 'Low'];
    const colors = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };

    const maxVal = Math.max(...priorities.map(p => prioritiesData[p] || 0), 1);
    const startX = 65;
    const startY = 30;
    const chartWidth = canvas.width - startX - 30;
    const chartHeight = canvas.height - 60;
    const barHeight = Math.min(25, chartHeight / (priorities.length * 1.5));
    const gap = barHeight * 0.8;

    priorities.forEach((prio, index) => {
        const val = prioritiesData[prio] || 0;
        const y = startY + index * (barHeight + gap);
        const w = (val / maxVal) * chartWidth;

        // Label
        ctx.fillStyle = document.body.classList.contains('dark-theme') ? '#f8fafc' : '#0f172a';
        ctx.font = '500 12px Outfit';
        ctx.textAlign = 'right';
        ctx.fillText(prio, startX - 10, y + barHeight / 1.5);

        // Bar
        ctx.fillStyle = colors[prio] || '#6366f1';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(startX, y, w || 2, barHeight, 5);
            ctx.fill();
        } else {
            ctx.fillRect(startX, y, w || 2, barHeight);
        }

        // Value text
        ctx.fillStyle = w > 20 ? '#ffffff' : (document.body.classList.contains('dark-theme') ? '#f8fafc' : '#0f172a');
        ctx.font = '600 10px Outfit';
        ctx.textAlign = w > 20 ? 'right' : 'left';
        const textX = w > 20 ? startX + w - 6 : startX + w + 5;
        ctx.fillText(val, textX, y + barHeight / 1.5);
    });
}


// ==========================================
// 6. AI PRODUCTIVITY COACH CHATBOT
// ==========================================

async function sendChatMessage(messageText) {
    if (!messageText) return;

    // Append user message bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'message user';
    userBubble.textContent = messageText;
    chatMessages.appendChild(userBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Append loading placeholder
    const assistantBubble = document.createElement('div');
    assistantBubble.className = 'message assistant';
    assistantBubble.textContent = 'Thinking...';
    chatMessages.appendChild(assistantBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({ message: messageText })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error((errData.error && errData.error.message) || errData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error('Received empty response from Gemini API.');
        }

        // Remove loading and show formatted text
        assistantBubble.innerHTML = formatMarkdown(responseText);
    } catch (e) {
        console.error('Gemini chatbot error:', e);
        assistantBubble.textContent = `Error: ${e.message}. Please verify your api_key.txt configuration.`;
        assistantBubble.style.color = 'var(--danger)';
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Basic markdown format helper
function formatMarkdown(text) {
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // bullet points
    html = html.replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
    // bold text
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // newlines
    html = html.replace(/\n/g, "<br>");
    return html;
}

sendChatBtn.addEventListener('click', () => {
    const txt = chatInput.value.trim();
    if (txt) {
        sendChatMessage(txt);
        chatInput.value = '';
    }
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const txt = chatInput.value.trim();
        if (txt) {
            sendChatMessage(txt);
            chatInput.value = '';
        }
    }
});

suggestButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        sendChatMessage(btn.dataset.msg);
    });
});


// ==========================================
// 7. AI TASK GENERATOR (DECOMPOSER)
// ==========================================

async function generateTasksWithAi() {
    const situation = aiSituationInput.value.trim();
    if (!situation) {
        setAiStatus('Please describe your project details first.', 'error');
        return;
    }

    setAiStatus('Contacting Gemini AI to break down project steps...', 'loading');
    generateAiTasksBtn.disabled = true;

    try {
        const response = await fetch('/api/generate-tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({ situation })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error((errData.error && errData.error.message) || errData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
            throw new Error('Received empty response from Gemini API.');
        }

        const cleanJson = rawText.replace(/```json|```/g, '').trim();
        const generatedTasks = JSON.parse(cleanJson);

        if (!Array.isArray(generatedTasks)) {
            throw new Error('AI output format is invalid (expected an array).');
        }

        const newTasks = generatedTasks.map(task => ({
            id: Date.now() + Math.random(),
            text: task.text || 'Unnamed AI Task',
            description: task.description || '',
            category: task.category || 'AI Generated',
            completed: false,
            priority: ['High', 'Medium', 'Low'].includes(task.priority) ? task.priority : 'Medium',
            dueDate: task.dueDate || '',
            createdAt: new Date().toISOString(),
            subtasks: [],
            focusSessions: 0
        }));

        tasks.push(...newTasks);
        await saveTasks();
        renderTasks();

        aiSituationInput.value = '';
        setAiStatus(`Decomposed successfully! Added ${newTasks.length} tasks to your board.`, 'success');
        
        setTimeout(() => {
            setAiStatus('', '');
        }, 4000);

    } catch (error) {
        console.error('Gemini API Error:', error);
        setAiStatus(`Decomposition failed: ${error.message}`, 'error');
    } finally {
        generateAiTasksBtn.disabled = false;
    }
}

function setAiStatus(message, type) {
    aiStatusMessage.textContent = message;
    if (type === 'error') {
        aiStatusMessage.style.color = 'var(--danger)';
    } else if (type === 'success') {
        aiStatusMessage.style.color = 'var(--success)';
    } else if (type === 'loading') {
        aiStatusMessage.style.color = 'var(--accent)';
    } else {
        aiStatusMessage.style.color = 'var(--text-muted)';
    }
}

generateAiTasksBtn.addEventListener('click', generateTasksWithAi);


// ==========================================
// 8. IMPORT & EXPORT JSON
// ==========================================

exportTasksButton.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `focusflow-tasks-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
});

importTasksButton.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                tasks = imported.map(t => ({
                    ...t,
                    subtasks: t.subtasks || [],
                    focusSessions: t.focusSessions || 0
                }));
                saveTasks();
                renderTasks();
                alert('Tasks imported successfully!');
            } else {
                alert('Invalid file format. Expected a JSON array of tasks.');
            }
        } catch (err) {
            alert('Failed to parse JSON file.');
        }
    };
    reader.readAsText(file);
});


// ==========================================
// 9. SEARCH, SORT, THEME & KEY SHORTCUTS
// ==========================================

addTaskButton.addEventListener('click', addTask);
newTaskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        addTask();
    }
});

searchInput.addEventListener('input', (event) => {
    searchQuery = event.target.value;
    renderTasks();
});

sortSelect.addEventListener('change', (event) => {
    sortOrder = event.target.value;
    renderTasks();
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        activeFilter = button.dataset.filter;
        renderTasks();
    });
});

dateFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        activeDateFilter = button.dataset.dateFilter;
        renderTasks();
    });
});

clearCompletedButton.addEventListener('click', clearCompletedTasks);
clearOverdueButton.addEventListener('click', clearOverdueTasks);
clearAllButton.addEventListener('click', clearAllTasks);
completeAllButton.addEventListener('click', toggleAllTasks);

// Theme Toggle logic
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggle.textContent = 'Light Mode';
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    
    // Rerender charts to update font colors matching dark theme
    updateDashboardStats();
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        searchInput.focus();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        newTaskInput.focus();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        exportTasksButton.click();
    }
});

// Initial startup load
loadTasks();
updateTimerDisplay();
