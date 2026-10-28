"use strict";

const STORAGE_KEY = "student-task-manager.tasks";

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const taskFilter = document.getElementById("taskFilter");
const taskSummary = document.getElementById("taskSummary");
const emptyState = document.getElementById("emptyState");
const formMessage = document.getElementById("formMessage");
const clearCompletedButton = document.getElementById("clearCompleted");

let tasks = loadTasks();

renderTasks();

taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        showMessage("Please enter a task before adding it.");
        taskInput.focus();
        return;
    }

    tasks.unshift({
        id: createTaskId(),
        title,
        completed: false
    });

    saveTasks();
    renderTasks();
    taskForm.reset();
    taskInput.focus();
    showMessage("Task added.");
});

taskFilter.addEventListener("change", renderTasks);

clearCompletedButton.addEventListener("click", () => {
    const completedCount = tasks.filter((task) => task.completed).length;

    if (completedCount === 0) {
        return;
    }

    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderTasks();
    showMessage("Completed tasks cleared.");
});

function createTaskId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTasks() {
    try {
        const savedValue = localStorage.getItem(STORAGE_KEY);

        // Migrate the previous version's string array, if one exists.
        const legacyValue = savedValue === null ? localStorage.getItem("tasks") : null;
        const parsed = JSON.parse(savedValue ?? legacyValue ?? "[]");

        if (!Array.isArray(parsed)) {
            return [];
        }

        const normalizedTasks = parsed
            .map((item) => {
                if (typeof item === "string" && item.trim()) {
                    return {
                        id: createTaskId(),
                        title: item.trim(),
                        completed: false
                    };
                }

                if (
                    item &&
                    typeof item.title === "string" &&
                    item.title.trim() &&
                    typeof item.completed === "boolean"
                ) {
                    return {
                        id: typeof item.id === "string" ? item.id : createTaskId(),
                        title: item.title.trim(),
                        completed: item.completed
                    };
                }

                return null;
            })
            .filter(Boolean);

        if (legacyValue !== null) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedTasks));
        }

        return normalizedTasks;
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        showMessage("Saved tasks could not be read. You can still add new tasks.");
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error("Could not save tasks:", error);
        showMessage("Could not save tasks in this browser. Check browser storage settings.");
    }
}

function renderTasks() {
    const filter = taskFilter.value;
    const visibleTasks = tasks.filter((task) => {
        if (filter === "active") return !task.completed;
        if (filter === "completed") return task.completed;
        return true;
    });

    taskList.replaceChildren();

    visibleTasks.forEach((task) => {
        const item = document.createElement("li");
        item.className = "task-item";
        if (task.completed) item.classList.add("is-completed");

        const label = document.createElement("label");
        label.className = "task-label";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Mark "${task.title}" as ${task.completed ? "active" : "completed"}`);
        checkbox.addEventListener("change", () => {
            updateTask(task.id, { completed: checkbox.checked });
        });

        const title = document.createElement("span");
        title.className = "task-title";
        // textContent prevents task text from being interpreted as HTML.
        title.textContent = task.title;

        label.append(checkbox, title);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete "${task.title}"`);
        deleteButton.addEventListener("click", () => {
            tasks = tasks.filter((savedTask) => savedTask.id !== task.id);
            saveTasks();
            renderTasks();
            showMessage("Task deleted.");
        });

        item.append(label, deleteButton);
        taskList.appendChild(item);
    });

    const completedCount = tasks.filter((task) => task.completed).length;
    taskSummary.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} · ${completedCount} completed`;
    emptyState.hidden = visibleTasks.length > 0;
    emptyState.textContent = tasks.length === 0
        ? "Nothing here yet. Add your first task above."
        : "No tasks match this filter.";
    clearCompletedButton.hidden = completedCount === 0;
}

function updateTask(taskId, changes) {
    tasks = tasks.map((task) =>
        task.id === taskId ? { ...task, ...changes } : task
    );

    saveTasks();
    renderTasks();
}

function showMessage(message) {
    formMessage.textContent = message;
}
