

# Contributing to CodeLeet

Thank you for your interest in contributing! We welcome all types of contributions, from bug reports to new features and documentation improvements.

---

## Reporting Issues
Before creating a new issue, please check the existing issues to see if your problem or suggestion has already been discussed. 

When opening a bug report, please include:
* A clear and descriptive title.
* Steps to reproduce the issue.
* Your environment (OS, version, etc.).
* Any relevant logs or screenshots.

## Development Workflow

This project is built using React, TypeScript, Vite, and Tailwind CSS.

### Prerequisites
*   Node.js (v16 or higher)
*   npm


1. **Fork the Repository**: Create a personal copy of the project on GitHub.
2. **Clone Locally**: Download the code to your machine.
   ```bash
   git clone https://github.com/pudeesht/CodeLeet.git
   ```
3. **Create a Branch**: Use a descriptive name for your branch.   
    ```bash
    git checkout -b fix/issue-description
    ```
4. **Make Changes**: Implement your fix or feature. Ensure you follow the existing coding style. 

5.  **Install dependencies**:
    ```bash
    npm install
    ```
6.  **Start the development server**:
    ```bash
    npm run dev
    ```
    This will provide a localhost link that you can install in Tampermonkey for hot-reloading.

    (This hot realoading was giving me issues, so I would rather prefer to use 'npm run build' and load that dist version directly to tapermonkey)
    #### Building
    To generate the final userscript file:
    ```bash
    npm run build
7. **Commit and Push**:  
    ```bash
    git add .
    git commit -m "Brief description of changes"
    git push origin fix/issue-description
    ```
8. **Open a Pull Request**: Submit your changes for review through the GitHub interface.

