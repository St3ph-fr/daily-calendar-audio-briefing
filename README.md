# 🎧 Gemini Powered Daily Audio Briefing (Google Apps Script) 🎧

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://script.google.com)
[![Gemini API](https://img.shields.io/badge/Gemini%20API-4A90E2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/docs/gemini_api_overview)

This Google Apps Script automates the creation of a daily audio briefing. It fetches today's events from your Google Calendar, uses Google's Gemini 2.5 Flash AI to generate a conversational summary, converts that summary into a WAV audio file using Gemini TTS, saves the audio to Google Drive, and creates a task in Google Tasks with a link to the audio for easy access every morning.

## ✨ Features

*   **Calendar Integration:** Fetches today's events from your primary Google Calendar.
*   **AI-Powered Summaries:** Uses `gemini-2.5-flash-preview-05-20` to generate a natural, friendly text summary of your day.
*   **Text-to-Speech:** Converts the text summary into a WAV audio file using `gemini-2.5-flash-preview-tts`.
*   **Google Drive Storage:** Saves the generated WAV audio file to your Google Drive.
*   **Google Tasks Integration:** Creates a daily task in a specified Google Tasks list (default: "Calendar Assistant") with the summary and a direct link to the audio file.
*   **Automated Daily Execution:** Designed to be run daily via a time-driven trigger.
*   **Handles No Events:** Provides a friendly message if no events are scheduled.

## ⚙️ How It Works

1.  **Fetch Calendar Events:** The script retrieves all events scheduled for the current day from the user's primary Google Calendar.
2.  **Generate Text Summary:**
    *   If events are found, the event details are sent to the Gemini 2.5 Flash API to generate a conversational summary.
    *   If no events are found, a default message like "Good morning! You have no events scheduled for today. Enjoy your day!" is used.
3.  **Generate Audio:** The text summary is sent to the Gemini TTS API (`gemini-2.5-flash-preview-tts`) to generate speech. The API returns audio data in L16 format.
4.  **Convert Audio to WAV:** The received L16 audio data is converted to the WAV format using a helper function.
5.  **Save to Google Drive:** The WAV audio file is saved to the root of the user's Google Drive with a name like `Daily Briefing - YYYY-MM-DD.wav`.
6.  **Create Google Task:** A new task is created in the "Calendar Assistant" task list (or a list specified by `TASK_LIST_NAME`). This task includes the text summary and a direct link to the audio file in Google Drive. The task is typically set with a due time for the morning.

## 🚀 Prerequisites

*   A Google Account.
*   Access to Google Calendar, Google Drive, and Google Tasks.
*   A **Gemini API Key**. You can obtain one from [Google AI Studio](https://aistudio.google.com/apikey).

## 🛠️ Setup Instructions

1.  **Create a new Google Apps Script Project:**
    *   Go to [script.new](https://script.new).
    *   Alternatively, open Google Drive, click "New" > "More" > "Google Apps Script".
2.  **Copy the Code:**
    *   Delete any boilerplate code in the `Code.gs` file.
    *   Copy the entire provided script content and paste it into `Code.gs`.
    *   Copy the appscript.json file too, first go to settings and click checkbox to display the appsscript.json file.
3.  **Save the Project:**
    *   Click the "Save project" icon (💾) or `Ctrl+S` / `Cmd+S`. Give your project a name (e.g., "Daily Audio Briefing").
4.  **Enable Advanced Google Services:**
    *   If you copy the appsscript.json file it is not necessary normaly. 
    *   In the Apps Script editor, on the left-hand sidebar, click on "Services" (+ icon).
    *   Find and add the following services:
        *   **Google Calendar API** (ensure it's turned ON)
        *   **Google Tasks API** (ensure it's turned ON)
    *   The script also uses `DriveApp`, which is a built-in service and doesn't need explicit enabling here.
5.  **Authorize the Script:**
    *   In the editor, select the `generateDailyBriefing` function from the function dropdown menu (next to the "Debug" button).
    *   Click the "Run" button (▶️).
    *   You will be prompted for authorization.
        *   Click "Review permissions".
        *   Choose your Google account.
        *   You might see a "Google hasn’t verified this app" warning. Click "Advanced" and then "Go to (your project name) (unsafe)".
        *   Review the permissions the script needs (manage your calendar, tasks, Drive files, connect to external services) and click "Allow".
6.  **Set Up a Daily Trigger:**
    *   Run the function setupDailyAudioBriefing(), it will create a daily trigger that run each morning between 7h and 8h.
    *   If you prefer you can set the trigger manually, follow the steps below.
    *   In the Apps Script editor, on the left-hand sidebar, click on "Triggers" (⏰ icon).
    *   Click the "+ Add Trigger" button in the bottom right.
    *   Configure the trigger as follows:
        *   **Choose which function to run:** `generateDailyBriefing`
        *   **Choose which deployment should run:** `Head`
        *   **Select event source:** `Time-driven`
        *   **Select type of time based trigger:** `Day timer`
        *   **Select time of day:** Choose a time that suits you (e.g., `6am to 7am`).
        *   Adjust "Failure notification settings" as desired.
    *   Click "Save".

## ▶️ Usage

Once set up with a daily trigger, the script will run automatically.

*   **Check Google Tasks:** Each day, after the trigger time, a new task will appear in your "Calendar Assistant" task list (or the list you configured) with the title "🎧 Your Daily Audio Briefing is Ready! 🎧". The task notes will contain the text summary and a link to the audio file.
*   **Access Audio File:** The audio file (`.wav`) will be saved in the root directory of your Google Drive.
*   **Manual Run:** You can manually run the `generateDailyBriefing` function from the Apps Script editor for testing. Check the "Executions" log for output and any errors.

## ⚙️ Configuration Variables

These constants can be adjusted at the top of the `Code.gs` file:

*   `TASK_LIST_NAME`: The name of the Google Task list where the daily briefing task will be created. Defaults to `"Calendar Assistant"`. The script will create this list if it doesn't exist.
*   `CALENDAR_ID`: The ID of the calendar to use. Defaults to `'primary'` (your main calendar).
*   `USE_REASONING`: Set to `true` to enable Gemini's reasoning capabilities via "thinking budget" for potentially more nuanced summaries. Defaults to `true`.
*   `GEMINI_API_KEY`: Your Gemini API Key.

## 📢 Important Notes

*   **API Quotas & Billing:** The Gemini API has usage quotas. Depending on your usage, you might encounter limits or require billing to be set up on your Google Cloud Project associated with the API key.
*   **Audio File Sharing:** By default, the audio file saved to Google Drive is private to you. If you need to share it, you'll need to adjust its sharing permissions manually or uncomment and modify the line `// file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);` in `generateDailyBriefing()` to make it accessible to others (e.g., `file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);`). Be mindful of the privacy implications.
*   **Error Handling:** The script includes basic `try...catch` blocks and logs errors to the Apps Script console (View > Logs or View > Executions).
*   **Audio Conversion:** The script uses a `convertL16ToWav_` function to convert the L16 audio format (typically returned by Gemini TTS for streaming) into a standard WAV file. This function is adapted from work by [Tanaike](https://github.com/tanaikech/UtlApp).

## 🐛 Troubleshooting

*   **"GEMINI_API_KEY not found..."**: Ensure you have correctly set the `GEMINI_API_KEY` in Script.
*   **"Advanced Service ... is not enabled"**: Double-check that you have enabled "Google Calendar API" and "Google Tasks API" under "Services" in the Apps Script editor.
*   **Authorization Errors**: Try re-running the script manually to re-trigger the authorization flow. Ensure you grant all requested permissions.
*   **Check Execution Logs**: For any issues, the first place to look is the execution log (View > Executions in the Apps Script editor). This will show errors and `console.log` messages.
*   **Gemini API Errors**: If errors mention the Gemini API, check your API key, ensure the models specified (`gemini-2.5-flash-preview-05-20`, `gemini-2.5-flash-preview-tts`) are available and correctly named, and review your Gemini API quotas and billing status in the Google Cloud Console.

## 📜 License

This project is licensed under the MIT License - see the LICENSE.md file for details.

Happy Briefing! 🎧
