# Student Task Manager

A lightweight browser-based task manager built with HTML, CSS, and vanilla JavaScript. It helps students keep a simple list of study and personal tasks without needing an account or backend server.

## Features

- Add tasks and reject empty or whitespace-only input
- Mark tasks as active or completed
- Filter the list by all, active, or completed tasks
- Delete an individual task or clear all completed tasks
- Persist task IDs, titles, and completion state in browser local storage
- Migrate tasks saved by the earlier version of this project
- Responsive layout with keyboard focus styles and accessible form labels
- Render task titles as text rather than HTML

## Technologies

- **HTML5** for page structure and form controls
- **CSS3** for responsive layout and styling
- **JavaScript** for DOM updates, event handling, filtering, and state management
- **Browser Local Storage** for persistence on the same browser and origin

## Run locally

1. Clone or download this repository.
2. Open the folder in VS Code.
3. Open `index.html` in a browser, or use the Live Server extension.
4. Add a task and refresh the page to confirm that saved tasks remain.

No package installation or backend server is required.

## How it works

The JavaScript keeps tasks in an array. Each task has an `id`, a `title`, and a `completed` boolean. When the user adds, completes, deletes, or clears tasks, the array is updated and saved as JSON in local storage. The interface is then rendered from that state. Stable IDs mean that deleting one task does not accidentally delete another task with the same title.

## Regression tests

Run the 8 logic-level regression tests with Node.js (no extra npm packages required):

```bash
node --test tests/task-manager-regression.test.cjs
```

The suite uses a mocked DOM to check adding tasks, blank-input rejection, completion persistence, duplicate-safe deletion, filtering, clearing completed tasks, migration of legacy saved tasks, and rendering HTML-like text safely. These are not full browser end-to-end or usability tests.

## Scope and limitations

- Tasks are stored only in the current browser profile and website origin; they do not sync between devices.
- Clearing browser storage may remove saved tasks.
- This is a frontend learning project, not a multi-user or cloud-backed task service.
- Test success does not measure real-user productivity or prove a percentage reduction in time spent managing tasks.

## Suggested manual checks

- Add a normal task and try submitting an empty task.
- Add two tasks with the same title, then delete only one.
- Mark a task complete, refresh the page, and check that its state persists.
- Try each filter and clear completed tasks.
- Test the layout at mobile and desktop widths.
