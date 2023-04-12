import * as fs from 'fs/promises'
import * as dotenv from 'dotenv';
import { App as SlackApp } from '@slack/bolt';

try {
  dotenv.config();
} catch (e) {
  console.error(e);
}

const slackApp = new SlackApp({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
})

// get slack messages given channel id from slack using Bolt API
export const getSlackMessages = async (channelId: string): Promise<any> =>  {
	const result = await slackApp.client.conversations.history({
		token: process.env.SLACK_BOT_TOKEN,
		channel: channelId,
		limit: 1000
	});
	return result.messages;
}

// Get slack replies given channel ID and threadts using Bolt API
export const getSlackReplies = async (channelId: string, replyTs: string, retryCount: number = 0) => {
	try {
		console.log(channelId, replyTs, retryCount)
		const result = await slackApp.client.conversations.replies({
			token: process.env.SLACK_BOT_TOKEN,
			channel: channelId,
			ts: replyTs
		});
		return result.messages;
	} catch (e) {
		if (retryCount > 5) {
			throw new Error('Failed to get replies')
		}
		console.log('Error. retry...', retryCount)
		await sleep(10000)
		getSlackReplies(channelId, replyTs, retryCount++)
	}
}

/**
* Store slack messages in a dataset object
*
* @param messages SlackMessages from getSlackMessages
*/
export const storeSlackMessages = async (channelId: string, messages: any): Promise<SlackDataset> => {
	const dataset: SlackDataset = {
		channelId,
		messages: []
	}
	const simplifiedMessages: SlackMessage[] = messages.map((m: { channel: string, user: string, text: string, reply_count: number, thread_ts: string }) => {
		return {
			user: m.user || 'unknown_user',
			text: m.text,
			hasReply: m.reply_count > 0 || false,
			reply_count: m.reply_count || 0,
			reply_ts: m.thread_ts || undefined
		}
	})

	const messagesWithReplies = []
	for (let message of simplifiedMessages) {
		messagesWithReplies.push(await fillinSlackReplies(channelId, message))
		console.log(messagesWithReplies.length)
		sleep(30000)
	}

	dataset.messages = messagesWithReplies
	return dataset
}

export const fillinSlackReplies = async (channelId: string, slackMessage: SlackMessage): Promise<SlackMessage> => {
	if(slackMessage.hasReply || !slackMessage.reply_ts)  return slackMessage

	const replies = await getSlackReplies(channelId, slackMessage.reply_ts)
	return {
		...slackMessage,
		replies: replies?.map((r) => ({ userId: r.user || '', text: r.text || '' })) || []
	}
}

export const exportAsJSONFile = async (dataset: SlackDataset)=> {
	const filePath = './slack_conversation.json'
	try {
    const jsonString = JSON.stringify(dataset, null, 2);
    await fs.writeFile(filePath, jsonString, 'utf-8');
		console.log('\n------------------')
    console.log(`JSON file has been created at ${filePath}`);
  } catch (error) {
    console.error('Error creating JSON file:', error);
  }
}

const sleep = async (ms: number) => {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms)
	})
}


type Reply = {
	text: string,
	userId: string,
}

type SlackMessage = {
	text: string,
	userId: string,
	hasReply: boolean,
	replies: Reply[]
	reply_count: number,
	reply_ts?: string
}

type SlackDataset = {
	channelId: string,
	messages: SlackMessage[]
}