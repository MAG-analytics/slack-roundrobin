const { App } = require('@slack/bolt');

// Initialize your app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true
});

const queues = {
  'C098F2EGUL9': ['U06KSH5H8FR', 'U014NGAJTFT'],   // shift-1 (channel ID)
  'C0990B8428Z': ['U013V5LEG3Z', 'U0149TEARJ6']   // shift-2 (channel ID)
  //'C03KLMNO789': ['U01ABCDEF12', 'U01GHIJKL34']    // after-hour (channel ID)
};

// Helper to get queue for the current channel
function getQueue(channelId) {
  return queues[channelId] || [];
}

// Helper to set updated queue
function setQueue(channelId, newQueue) {
  queues[channelId] = newQueue;
}

// Helper to format queue status
function formatQueueStatus(channelId) {
  const queue = getQueue(channelId);
  if (queue.length === 0) return 'Queue is empty.';

  const statusLines = queue.map((userId, i) => `${i + 1}. <@${userId}>`).join('\n');
  const onCall = `<@${queue[0]}>`;
  const nextUp = queue[1] ? `<@${queue[1]}>` : 'N/A';

  return `${onCall} is on call, ${nextUp} will be next.\n\n📋 *Current Queue:*\n${statusLines}`;
}

// ✅ Lead command
app.message(/^(l|lead)$/i, async ({ message, say, client }) => {
  const user = message.user;
  const channelId = message.channel;
  console.log(`Lead command triggered by user: ${user} in channel: ${channelId}`);
  let queue = getQueue(channelId);
  console.log(`Current queue for channel ${channelId}:`, queue);

  if (!queue.includes(user)) {
    await say(`<@${user}>, you're not in the queue for this channel.`);
    return;
  }

  if (user !== queue[0]) {
    await say(`<@${user}>, it's not your turn yet! <@${queue[0]}> is on duty.`);
    return;
  }

  queue.push(queue.shift());
  setQueue(channelId, queue);

  await say(`<@${user}> has claimed a lead.\n${formatQueueStatus(channelId)}`);
});

// ➕ Add command
app.message(/^(a|add)$/i, async ({ message, context, say }) => {
  const userId = context.matches[1];
  const channelId = message.channel;
  let queue = getQueue(channelId);

  if (queue.includes(userId)) {
    await say(`<@${userId}> is already in the queue.`);
    return;
  }

  queue.push(userId);
  setQueue(channelId, queue);
  await say(`Added <@${userId}> to the queue.\n${formatQueueStatus(channelId)}`);
});

// ➖ Remove command
app.message(/^(r|remove)$/i, async ({ message, context, say }) => {
  const userId = context.matches[1];
  const channelId = message.channel;
  let queue = getQueue(channelId);

  if (!queue.includes(userId)) {
    await say(`<@${userId}> is not in the queue.`);
    return;
  }

  queue = queue.filter(id => id !== userId);
  setQueue(channelId, queue);
  await say(`Removed <@${userId}> from the queue.\n${formatQueueStatus(channelId)}`);
});

// ⏭️ Skip command
app.message(/^(s|skip)$/i, async ({ message, context, say }) => {
  const userId = context.matches[1];
  const channelId = message.channel;
  let queue = getQueue(channelId);

  if (!queue.includes(userId)) {
    await say(`<@${userId}> is not in the queue.`);
    return;
  }

  // Move the user to the end
  queue = queue.filter(id => id !== userId);
  queue.push(userId);
  setQueue(channelId, queue);

  await say(`<@${userId}> has been skipped.\n${formatQueueStatus(channelId)}`);
});

// 📋 Queue status (manual check)
app.message(/^status$/i, async ({ message, say }) => {
  await say(formatQueueStatus(message.channel));
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack Bot is running!');
})();