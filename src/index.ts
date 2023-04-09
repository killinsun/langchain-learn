import { ChatOpenAI } from "langchain/chat_models";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings, CohereEmbeddings } from "langchain/embeddings";
import { Chroma } from "langchain/vectorstores";
import { VectorDBQAChain } from "langchain/chains";

async function train_model() {
  const loader = new PuppeteerWebBaseLoader("https://mx.wovn.io/casestudy");
  const docs = await loader.load();
  const textSplitter = new CharacterTextSplitter({
    separator: "<div>",
    chunkSize: 100,
    chunkOverlap: 2,
  });
  const output = await textSplitter.splitDocuments(docs);
  const embeddings = new CohereEmbeddings();

  try {
    const vectorStore = await Chroma.fromDocuments(output, embeddings, {
      collectionName: "mx.wovn.io",
    });
    const response = await vectorStore.similaritySearch("WOVN");
    console.log(response);
  } catch (e) {
    console.error(e);
  }
}

async function chatbot() {
  const chat = new ChatOpenAI({ temperature: 0.9 });
  const vectorStore = await Chroma.fromExistingCollection(
    new OpenAIEmbeddings(),
    {
      collectionName: "mx.wovn.io",
    }
  );

  const chain = VectorDBQAChain.fromLLM(chat, vectorStore);
  const response = await chain.call({
    query: "WOVN.io の最近のニュースは？",
  });
  console.log(response);
}

async function main() {
  const chat = new ChatOpenAI({ temperature: 0.9 });
  const response = await chat.call([
    new SystemChatMessage(
      "You are an ironically machine translation bot that translates English to Japanese "
    ),
    new HumanChatMessage("I love programming."),
  ]);
  console.log(response);
  // const template = "What is a good name for a company that makes {product}?";
  // const prompt = new PromptTemplate({
  //   template: template,
  //   inputVariables: ["product"],
  // });

  // const chain = new LLMChain({ llm: chat, prompt: prompt });
  // const res = await chain.call({
  //   product: "multilingual translation platform",
  // });
  // console.log(res);
}

// main();

// train_model();

chatbot();
