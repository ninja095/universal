require('dotenv').config()
const OpenAI = require ("openai");
const toFile  = OpenAI.toFile;
const fs  = require ("fs");
const path  = require ("path");
const TEST = process.env.NODE_ENV == 'test';

const util = require('util')
const stream = require('stream')
const pipeline = util.promisify(stream.pipeline);

const openai = new OpenAI(process.env.OPENAI_API_KEY);
// console.log(openai);
// process.exit(0);
class OpenAIConnector {

  constructor(){
  }
    

/*
you should accumulate the messages in the conversation and send them all at once to the completion endpoint.

Example of messages:
  [{
    "role": "user",
    "content": "Hello, I'm a user."
  },{
    "role": "assistant",
    "content": "Hello, how can I help you?"
  },{
    "role": "user",
    "content": "Why roses are red?"
  }]

  Models: 
  gpt-3.5-turbo - cheaper, less advanced
  gpt-4-1106-preview - more advanced, more expensive

*/

  async completion(messages = [], 
    system=`You are a useful assistant. You can answer questions, provide information, and help with tasks.`, 
    model = "gpt-4-1106-preview") {
  
    let time;
    if (TEST) time = Date.now();
    const completion = await openai.chat.completions.create({
      messages: [
          {
            "role": "system",
            "content": system
          },
          ...messages
        ],
       model: model
    });
    if (TEST) console.log((Date.now() - time)/1000);
    // console.log(completion);
    return completion.choices[0];
  }

  /*
  voices: onyx, alloy, echo, fable, onyx, nova, and shimmer

  */

  async textToSpeech(text, pathToFile = "./speech.mp3", model="tts-1", voice="onyx") {
    const speechFile = path.resolve(pathToFile);
    let time;
    if (TEST) time = Date.now();
    const mp3 = await openai.audio.speech.create({
      model,
      voice,
      input: text,
    });
    if (TEST) console.log((Date.now() - time)/1000);
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
    return buffer;
  }

  
async speechToText(pathToFile = "./speech.mp3") {

  const buffer = await fs.promises.readFile(path.resolve(pathToFile));
  let time;
  if (TEST) time = Date.now();
  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(buffer, 'speech.mp3'),
    model: 'whisper-1',
  });
  if (TEST) console.log((Date.now() - time)/1000);
  return transcription.text;
}


async speechTranslation(pathToFile = "./speech.mp3") {
  const buffer = await fs.promises.readFile(path.resolve(pathToFile));
  let time;
  if (TEST) time = Date.now();
  const translation = await openai.audio.translations.create({
    file: await toFile(buffer, 'speech.mp3'),
    model: 'whisper-1',
  });
  if (TEST) console.log((Date.now() - time)/1000);
  return translation.text;
}



async textModeration(text) {
  let time;
  if (TEST) time = Date.now();
  const responce = await openai.moderations.create({
    // model: 'content-filter-alpha-c4',
    input: text,
  });
  if (TEST) console.log((Date.now() - time)/1000);
  return responce.results[0];

}
//......ASSISTANTS.............
/*
The main advantage of an assistant in comparison to completeon - you don't have to send all the messages to OpenAI for each user interaction. 
You can send only a new message to the assistant and OpenAI will keep and manage the context of the conversation.
The disadvantage is - you can't add or remove some other content to the conversation, like info from other models or any other data.
And it's still beta -  sometimes it does not behave according to instructions
*/

/*
      name = "Math Tutor", 
      instructions = "You are a personal math tutor. Write and run code to answer math questions.", 
      tools = [{ type: "code_interpreter" }], 
      model = "gpt-4-1106-preview"

*/


async createAssistant(
      name , 
      instructions, 
      tools = [], 
      model = "gpt-4-1106-preview") {

      return await openai.beta.assistants.create({
          name,
          instructions,
          tools,
          model
        });
}
/*
 id = "asst_q0mHbtQqRndSmFWM8UyFMpWM"
*/
async retrieveAssistant(id) {
  return await openai.beta.assistants.retrieve(id);
}

/*
    id = "asst_q0mHbtQqRndSmFWM8UyFMpWM"
   {
      instructions:
        "You are an HR bot, and you have access to files to answer employee questions about company policies. Always response with info from either of the files.",
      name: "HR Helper",
      tools: [{ type: "retrieval" }],
      model: "gpt-4-1106-preview",
      file_ids: [
        "file-abc123",
        "file-abc456",
      ],
    }
*/
async updateAssistant(id, name, instructions, tools, model, file_ids = []) {
  return await openai.beta.assistants.update(id, {
    name,
    instructions,
    tools,
    model,
    file_ids
  });

}

async createThread() {
  return await openai.beta.threads.create();
}

/*
id = 'thread_D1Fc45AQAhZsywNdSAGReFpM'
*/
async retrieveThread(id) {
  return await openai.beta.threads.retrieve(id);
}

/*
'thread_D1Fc45AQAhZsywNdSAGReFpM'
 {
        role: "user",
        content: "I need to solve the equation `3x + 11 = 14`. Can you help me?"
      }
*/
async addMessageToThread(thread_id, role, content) {
  return await openai.beta.threads.messages.create(
      thread_id,
      {
        role,
        content
      }
    );
}
/*
'thread_D1Fc45AQAhZsywNdSAGReFpM',
    { 
      assistant_id: assistant.id,
      instructions: "Please address the user as Jane Doe. The user has a premium account."
    }
*/

async runThread(thread_id, assistant_id, instructions) {
  return await openai.beta.threads.runs.create(
    thread_id,
    { 
      assistant_id,
      instructions
    }
  );
}

/*

*/

async retrieveRun(thread_id, run_id) {
  return await openai.beta.threads.runs.retrieve(
    thread_id,
    run_id
  );
}

async retrieveThreadMessages(thread_id) {
  return await openai.beta.threads.messages.list(
    thread_id
  );
}

cleanThreadMessages(threadMessages) {
  const messages = [];
  for (message of threadMessages.data){
    messages.push(message.content);
  }
    // console.log({message0:messages[0][0].text, message1:messages[1][0].text});
  return messages;
}

async getRunLogs(thread_id, run_id) {
  const logs = await openai.beta.threads.runs.steps.list(
    thread_id,
    run_id
  );
  const messages = [];
  for (log of logs.body.data){
    messages.push(log.step_details);
  }
  return messages;
}


}

module.exports = new OpenAIConnector();


