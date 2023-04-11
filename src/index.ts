import * as dotenv from 'dotenv';
import { ChatOpenAI } from "langchain/chat_models";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders";
import { CharacterTextSplitter, RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, CohereEmbeddings } from "langchain/embeddings";
import { Chroma } from "langchain/vectorstores";
import { VectorDBQAChain } from "langchain/chains";
import readLinePromises from 'readline/promises'

try {
  dotenv.config();
} catch (e) {
  console.error(e);
}


async function train_model(url: string, collectionName: string) {
  const loader = new PuppeteerWebBaseLoader(url);
  const docs = await loader.load();
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 300,
    chunkOverlap: 2,
  });
  const output = await textSplitter.splitDocuments(docs);
  console.log(output)
  const embeddings = new OpenAIEmbeddings();

  try {
    const vectorStore = await Chroma.fromDocuments(output, embeddings, {
      collectionName: collectionName,
    });
    const response = await vectorStore.similaritySearch("WOVN");
    console.log('success!')
  } catch (e) {
    console.error(e);
  }
}

async function chatbot(msg: string) {
  const chat = new ChatOpenAI({ temperature: 0.9 });
  const vectorStore = await Chroma.fromExistingCollection(
    new OpenAIEmbeddings(),
    {
      collectionName: "mx.wovn.io",
    }
  );

  const chain = VectorDBQAChain.fromLLM(chat, vectorStore);
  const response = await chain.call({
    query: msg
  });
  console.log(response.text);
}

async function main() {
  const question = `
  1. Train a model
  2. ChatBot
  Choose menu:`
  const rl = readLinePromises.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  while (true) {
    const answer = await rl.question(question)
    if (answer == "1") {
      const url = await rl.question("URL: ")
      const collectionName = await rl.question("Collection Name: ")
      await train_model(url, collectionName)
    } else if (answer == "2") {
      console.log("Hello! How can I help you today?")

      while (true) {
        const msg = await rl.question("Message: ")
        if (msg === "end") {
          break;
        }
        console.log('thinking....')
        await chatbot(msg)
      }
    } else {
      break
    }
  }

  rl.close();
  process.exit(0)
}

main();

