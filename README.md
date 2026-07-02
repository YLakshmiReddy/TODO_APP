# Java Local To-Do Web App

This project is a feature-rich to-do web application served locally by a Java program.
It uses:
- Java for local hosting
- HTML/CSS/JavaScript for the app UI
- `localStorage` to persist tasks in the browser

## Files
- `src/Main.java` - starts a local HTTP server on `http://localhost:8000`
- `web/index.html` - HTML structure and controls
- `web/styles.css` - page styling and responsive layout
- `web/app.js` - task logic, localStorage, search, sort, and bulk actions

## How to run
1. Make sure you have Java JDK installed (Java 11 or newer).
2. Open a terminal in this project folder.
3. Compile the Java server:

```powershell
javac -d out src/Main.java
```

4. Run the server:

```powershell
java -cp out Main
```

5. Open `http://localhost:8000` in your browser.

## What the app can do
- Add new tasks
- Add a due date and priority for each task
- Search tasks by text
- Sort tasks by newest, oldest, due date, or priority
- Filter tasks by all / active / completed
- Mark tasks complete / incomplete
- Edit or delete tasks
- Toggle all tasks complete
- Clear completed tasks
- Clear all tasks
- Save tasks in browser storage so they remain after reload

## Notes
- This is a local web app with no external backend.
- The browser stores your data locally using `localStorage`.
- Want to package the server as a `.jar` next? I can help with that too.
