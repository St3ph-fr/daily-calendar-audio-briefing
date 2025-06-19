/**
 * @fileoverview This script creates a daily audio briefing. It fetches today's
 * events from Google Calendar, generates a summary using the Gemini API,
 * creates an WAV audio file, saves it to Google Drive, 
 * and create a task in Google Task for easy access.
 *
 * @version 1.0
 */

/** 
 * Name for Task listin Google Task
 */
const TASK_LIST_NAME = "Calendar Assistant";
/**
 * The ID of the calendar to use. 'primary' is the default.
 */
const CALENDAR_ID = 'primary';

/**
 * Set to true to enable Gemini's reasoning capabilities via "thinking budget".
 */
const USE_REASONING = true;

// Gemini API Key
const GEMINI_API_KEY = "YOUR_API_KEY";
/**
 * Create trigger to run 'generateDailyBriefing'
 * Execution each morning between 7h et 8h.
 */
function setupDailyAudioBriefing() {
  // Supprime tous les déclencheurs existants avant d'en créer un nouveau
  ScriptApp.getProjectTriggers().forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('generateDailyBriefing')
      .timeBased()
      .everyDays(1)
      .atHour(7) 
      .create();

  Logger.log('Trigger "generateDailyBriefing" created to tun each morning between 7h and 8h.');
}

/**
 * Main function to orchestrate the daily briefing process.
 * This is the function you should run.
 */
function generateDailyBriefing() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in Script Properties. Please add it.");
  }
  // Verify that advanced services are enabled.
  try {
    Calendar.Events.list(CALENDAR_ID, {maxResults: 1});
    if (CHAT_SPACE_NAME && CHAT_SPACE_NAME !== 'spaces/REPLACE_WITH_YOUR_SPACE_NAME') {
      Chat.Spaces.get({name: CHAT_SPACE_NAME});
    }
  } catch(e) {
    if (e.message.includes("is not defined")) {
       console.log("ERROR: An Advanced Service (Calendar or Chat) is not enabled. Please follow the setup instructions.");
       return;
    }
  }

  try {
    console.log("Fetching today's calendar events...");
    const eventsText = getTodaysEvents();
    let summary;
    let audioFile;

    if (eventsText.startsWith("No upcoming events")) {
      summary = "Good morning! You have no events scheduled for today. Enjoy your day!";
      console.log(summary);
      audioFile = createSpeechWithGemini(summary);
    } else {
      console.log("Today's Events:\n" + eventsText);
      console.log("Generating summary with Gemini...");
      summary = generateSummaryWithGemini(eventsText);
      console.log("Generated Summary:\n" + summary);
      console.log("Generating speech with Gemini TTS...");
      audioFile = createSpeechWithGemini(summary);
    }
    
    console.log(`Successfully created audio briefing: ${audioFile.getUrl()}`);
    // IMPORTANT: If it is shared with others people it must be shared with each person or make it public
    // file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const message = `${summary}\n\nListen here: ${audioFile.getUrl()}` ;
    const now = new Date();
    addCalendarAssistantTask("🎧 Your Daily Audio Briefing is Ready! 🎧", message, now);
  } catch (e) {
    console.log(`An error occurred: ${e.toString()}\nStack: ${e.stack}`);
  }
}

/**
 * Gets the "Calendar Assistant" task list ID. If it doesn.t exist, it creates it.
 * @returns {string} The ID of the "Calendar Assistant" task list.
 */
function getOrCreateCalendarAssistantTaskListId() {
  let taskListId = null;
  try {
    const taskLists = Tasks.Tasklists.list();

    if (taskLists.items) {
      for (let i = 0; i < taskLists.items.length; i++) {
        const taskList = taskLists.items[i];
        if (taskList.title === TASK_LIST_NAME) {
          taskListId = taskList.id;
          console.log('Task list "%s" with ID "%s" was found.', TASK_LIST_NAME, taskListId);
          break;
        }
      }
    }

    if (!taskListId) {
      // Task list does not exist, so create it
      const newTaskList = Tasks.Tasklists.insert({
        title: TASK_LIST_NAME
      });
      taskListId = newTaskList.id;
      console.log('Task list "%s" with ID "%s" was created.', TASK_LIST_NAME, taskListId);
    }
  } catch (err) {
    console.error('Failed to get or create task list: %s', err.message);
    throw new Error('Could not retrieve or create the "Calendar Assistant" task list.');
  }
  return taskListId;
}

/**
 * Adds a task to the "Calendar Assistant" task list with a title, body, and due date.
 * The due date will be set for 8:15 AM on the specified date.
 * @param {string} title The title of the task.
 * @param {string} body The body/notes of the task.
 * @param {Date} date The date for which the task is due.
 */
function addCalendarAssistantTask(title, body, date) {
  const taskListId = getOrCreateCalendarAssistantTaskListId();

  if (!taskListId) {
    console.error("Could not retrieve a valid task list ID. Task not added.");
    return;
  }
  date.setTime(date.getTime() + (5*60*1000) );

  // Format the date to RFC 3339 timestamp, which is required by the Tasks API
  const dueDate = date.toISOString();
  let task = {
    "title": title,
    "notes": body,
    "due": dueDate
  };

  try {
    task = Tasks.Tasks.insert(task, taskListId);
    console.log('Task "%s" with ID "%s" was created in "Calendar Assistant".', title, task.id);
  } catch (err) {
    console.error('Failed to add task "%s": %s', title, err.message);
    throw new Error(`Could not add task "${title}" to the "Calendar Assistant" task list.`);
  }
}


/**
 * Gets all events for the current day from the specified Google Calendar.
 * @returns {string} A formatted string of today's events, or a message if there are no events.
 */
function getTodaysEvents() {
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  try {
    const events = Calendar.Events.list(CALENDAR_ID, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    if (!events.items || events.items.length === 0) {
      return 'No upcoming events found for today.';
    }
    let eventDetails = "Here are the events for today:\n";
    for (const event of events.items) {
      let startTime = event.start.date ? "All-day" : new Date(event.start.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      eventDetails += `- ${event.summary} at ${startTime}\n`;
    }
    return eventDetails;
  } catch (e) {
    throw new Error(`Could not fetch calendar events: ${e.message}`);
  }
}

/**
 * Generates a text summary of events using the Gemini API.
 * @param {string} eventsText The formatted string of calendar events.
 * @returns {string} The AI-generated summary.
 */
function generateSummaryWithGemini(eventsText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
  const generationConfig = {
    temperature: 0.7,
    responseMimeType: 'text/plain',
    thinkingConfig: { "thinkingBudget": USE_REASONING ? 1024 : 0 }
  };
  const prompt = `Create a short, friendly, conversational summary of my day for a morning briefing. Start with a warm greeting. Here are my events:\n\n${eventsText}`;
  const data = { generationConfig, contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  const options = { method: 'POST', contentType: 'application/json', payload: JSON.stringify(data), muteHttpExceptions: true };
  const response = UrlFetchApp.fetch(url, options);
  const responseBody = response.getContentText();
  if (response.getResponseCode() === 200) {
    return JSON.parse(responseBody).candidates[0].content.parts[0].text.trim();
  }
  throw new Error(`Gemini summary request failed: ${responseBody}`);
}

/**
 * Creates an audio file from text using the Gemini TTS API, requesting MP3 format directly.
 * This updated version reflects changes in the API response structure (using 'inlineData')
 * and adds a specific audio encoding request to simplify file creation.
 *
 * @param {string} textToSpeak The text to convert to speech.
 * @returns {GoogleAppsScript.Drive.File} The created MP3 file object in Google Drive.
 */
function createSpeechWithGemini(textToSpeak) {
  const model = 'gemini-2.5-flash-preview-tts';
  const apiAction = 'streamGenerateContent';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${apiAction}?key=${GEMINI_API_KEY}&alt=json`;

  
  const data = {
    contents: [{
      role: "user",
      parts: [{ "text": textToSpeak }]
    }],
    generationConfig: {
      responseModalities: ["audio"],
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            "voice_name": "Zephyr"
          }
        }
      }
    }
  };
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();
  if (responseCode === 200) {
    // The response is a JSON array of streamed chunks.
    const chunks = JSON.parse(responseBody);
    let combinedBase64 = "";
    let mimeType ;
    // Iterate through the chunks to find the audio data.
    // Based on the new TypeScript example, the key is now 'inlineData'.
    for (const chunk of chunks) {
      console.log(chunk)
      // Use optional chaining for safe navigation through the nested object.
      console.log(JSON.stringify(chunk?.candidates?.[0]?.content))
      const inlineData = chunk?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (inlineData && inlineData.data) {
        combinedBase64 += inlineData.data;
        mimeType = !mimeType ? inlineData.mimeType : mimeType
      }
    }

    if (combinedBase64 === "") {
      // Provide a more detailed error if no audio data was found in the response.
      throw new Error(`Gemini TTS API returned no audio data. Response: ${responseBody}`);
    }

    const decodedAudio = Utilities.base64Decode(combinedBase64);
    const fileName = `Daily Briefing - ${new Date().toISOString().split('T')[0]}.wav`;
    
    // The MimeType is now definitely MP3 because we requested it.
    const audioBlob = Utilities.newBlob(convertL16ToWav_(decodedAudio, mimeType), "audio/wav", fileName);
    return DriveApp.createFile(audioBlob);

  } else {
    throw new Error(`Gemini TTS request failed with code ${responseCode}: ${responseBody}`);
  }
}

/**
 * ### Description
 * Converts a byte data of "audio/L16" to a byte data of "audio/wav".
 * L16 assumes 16-bit PCM.
 * This audio format is often used with Text-To-Speech (TTS).
 * Ref: https://datatracker.ietf.org/doc/html/rfc2586
 * Ref: https://medium.com/google-cloud/text-to-speech-tts-using-gemini-api-with-google-apps-script-6ece50a617fd
 * Source : https://github.com/tanaikech/UtlApp?tab=readme-ov-file#convertl16towav
 * 
 * When this sample script is run, when the data is "audio/L16", the data is converted to "audio/wav".
 * 
 * @param {Byte[]} inputData Input data (audio/L16).
 * @param {number} sampleRate Ex. 8000, 11025, 16000, 22050, 24000, 32000, 44100, and 48000. Default is 24000.
 * @param {number} numChannels - Mono and stereo are 1 and 2, respectively. Default is 1.
 * @return {Byte[]} Converted data as byte data.
 */
function convertL16ToWav_(inputData,mimeType, numChannels = 1) {
  const [type, codec, sampleRate] = mimeType.split(";").map(e => e.includes("=") ? e.trim().split("=")[1] : e.trim());
  if (!Array.isArray(inputData)) {
    throw new Error("Invalid data.");
  }
  const bitsPerSample = 16;
  const blockAlign = numChannels * bitsPerSample / 8;
  const byteRate = Number(sampleRate) * blockAlign;
  const dataSize = inputData.length;
  const fileSize = 36 + dataSize;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const data = [
    { method: "setUint8", value: [..."RIFF"].map(e => e.charCodeAt(0)), add: [0, 1, 2, 3] },
    { method: "setUint32", value: [fileSize], add: [4], littleEndian: true },
    { method: "setUint8", value: [..."WAVE"].map(e => e.charCodeAt(0)), add: [8, 9, 10, 11] },
    { method: "setUint8", value: [..."fmt "].map(e => e.charCodeAt(0)), add: [12, 13, 14, 15] },
    { method: "setUint32", value: [16], add: [16], littleEndian: true },
    { method: "setUint16", value: [1, numChannels], add: [20, 22], littleEndian: true },
    { method: "setUint32", value: [Number(sampleRate), byteRate], add: [24, 28], littleEndian: true },
    { method: "setUint16", value: [blockAlign, bitsPerSample], add: [32, 34], littleEndian: true },
    { method: "setUint8", value: [..."data"].map(e => e.charCodeAt(0)), add: [36, 37, 38, 39] },
    { method: "setUint32", value: [dataSize], add: [40], littleEndian: true },
  ];
  data.forEach(({ method, value, add, littleEndian }) =>
    add.forEach((a, i) => view[method](a, value[i], littleEndian || false))
  );
  return [...new Uint8Array(header), ...inputData];
}
