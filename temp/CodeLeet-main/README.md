# CODE LEET

A browser userscript designed to analyze LeetCode contest submissions for potential cheating. 

As of now it provides detailed keystroke analysis and direct access to code replays without needing to manually search through ranking pages, helps in reviewing leetcode profiles easily.

I plan to add a lot more features soon!

## Features

*   **Contest History Scanner:** Instantly fetch the last 5 attended contests for any user directly on their profile page.
*   **Keystroke Analysis:** Analyzes submission events to detect:
    *   Direct external pastes (likely copied from LLMs or other sources).
    *   Natural typing patterns versus bulk insertions.
    *   Focus loss (tab switching) frequency.
*   **Smart Filtering:** Distinguishes between internal code refactoring (cut/paste within the editor) and external pasting to reduce false positives.
*   **Direct Replay Links:** auto-calculates the correct page number and provides a direct link to the specific contest ranking page to watch the code replay.
*   **Isolated UI:** Uses Shadow DOM to ensure the interface does not break LeetCode's layout or styles.

## Installation

This tool works as a Userscript and requires a script manager extension.

### Step 1: Install a Script Manager
You need a browser extension to run the script.
*   **Chrome/Edge/Brave:** Install Tampermonkey.
*   **Firefox:** Install Greasemonkey or Tampermonkey.


__(Make sure to allow external scripts in tapermonkey before installing my script, else tapermonkey wont run external scripts!)__

### Step 2: Install the Script
Click the link below to install the script directly from this repository. Your script manager will detect the file and ask for confirmation.

**[CLICK HERE TO INSTALL SCRIPT](https://github.com/pudeesht/codeleet/raw/main/dist/leetcode-detective.user.js)**

### Step 3: Enable Browser Developer Mode

#### Google Chrome / Microsoft Edge / Brave

1. Open the browser.

2. Go to: ```chrome://extensions/```

3. In the top-right corner, toggle Developer mode → ON

4. Developer options should now appear (e.g., “Load unpacked”).

### Step 4: Enable “Allow User Scripts” in Tampermonkey

1. This step is required in all browsers.

2. Click the **Tampermonkey** icon in the browser toolbar  
   **OR**  
   Go to `chrome://extensions/`


3. Go to the **Tampermonkey** extension  
   → Select **Manage extension**
4. Scroll Down 

5. Find Allow User Scripts Enable it


*(Note: If the link above does not work, navigate to the `dist` folder in this repository, click `leetcode-detective.user.js`, and view the "Raw" file).*

## Usage

1.  Navigate to any user profile on LeetCode (e.g., `leetcode.com/u/username`).
2.  Look for the floating button in the bottom-right corner of the screen.
3.  Click the button to open the control panel.
4.  Click **Scan Last 5 Contests**.
5.  Click on a specific contest to run the cheating analysis or click the monitor icon to jump to the official replay page.

## Analysis Legend

*   **SAFE (Green):** The user typed the solution naturally or performed standard refactoring.
*   **SUS (Yellow):** The user exhibited unusual behavior, such as high frequency of tab switching or bulk insertions that are borderline.
*   **CHEAT (Red):** The user performed a direct paste from an external source or inserted a massive amount of code in a single event that is physically impossible to type manually.
*   **SKIPPED (Gray):** The user did not attempt the question or did not achieve an Accepted status.

## DISCLAIMER
This tool does not work with 100% accuracy, there may be cases where someone writing in their own IDE and then pasting the code in leetcode, get flagged as cheater.

I will be working to improve this, but as of now the analysis is just probablistic based, it should not be taken as absolute proof of anything!

##  Tech Stack

This project is built with:

- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**

>  **Work in Progress**  
> This project is currently under active development. New features will be added soon.


