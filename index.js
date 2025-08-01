const { App } = require('@slack/bolt');

// Initialize your app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true
});

const allowedClearUsers = ['U06KSH5H8FR', 'U014NGAJTFT', 'U013V5LEG3Z', 'U0149TEARJ6'];

const queues = {
  'C098LBR46LA': ['U02MPNMK49L','U08BJ2X1YQ3','U08KBSDRW6P', 'U085ERNB35J','U05D7PCN1RU','U05CZQWARFZ','U01HBSPDGUC','U03K5ETN0G0','U06CZ9UUXUG'],   // shift-1 (channel ID)
  'C098H2AE8CT': ['U02UZPQAAN8','U08BJ2V7F4K','U02UY7W08MV','U03GV9C91Q8','U02NZ9A6LDC','U05RA4A0SG4','U0450HCK7EH','U05TD9QP4MC','U01RKJPS5K8'],   // shift-2 (channel ID)
  'C098LH65SAW': []    // after-hour (channel ID)
};



// Helper to get queue for the current channel
function getQueue(channelId) {
  return queues[channelId] || [];
}

// Helper to set updated queue
function setQueue(channelId, newQueue) {
  queues[channelId] = newQueue;
}

// Helper to format queue status (only @ first two)
// Helper to format queue status (mention only first two, plain names in list)
async function formatQueueStatus(channelId, client) {
  const queue = getQueue(channelId);
  if (queue.length === 0) return 'Queue is empty.';

  // Fetch display names
  const nameList = await Promise.all(
    queue.map(async (userId) => {
      try {
        const res = await client.users.info({ user: userId });
        console.log(`Fetched user info for ${userId}:`, res.user.real_name);
        return res.user.real_name;
      } catch (e) {
        console.error(`Failed to fetch name for ${userId}:`, e);
        return userId;
      }
    })
  );

  const onCallMention = `<@${queue[0]}>`;
  const nextMention = queue[1] ? `<@${queue[1]}>` : 'N/A';

  const plainQueueList = nameList
    .map((name, i) => `${i + 1}. ${name}`)
    .join('\n');

  return `${onCallMention} is on call, ${nextMention} will be next.\n\n📋 *Current Queue:*\n${plainQueueList}`;
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

  const queueStatus = await formatQueueStatus(channelId, client);
  await say(`<@${user}> has claimed a lead.\n${queueStatus}`);
});

// ➕ Add command
app.message(/^(a|add)$/i, async ({ message, context, say, client }) => {
  const userId = message.user;
  const channelId = message.channel;
  let queue = getQueue(channelId);

  if (queue.includes(userId)) {
    await say(`<@${userId}> is already in the queue.`);
    return;
  }

  queue.push(userId);
  setQueue(channelId, queue);
  const queueStatus = await formatQueueStatus(channelId, client);
  await say(`Added <@${userId}> to the queue.\n${queueStatus}`);
});

// ➖ Remove command
app.message(/^(r|remove)$/i, async ({ message, context, say, client }) => {
  const userId =  message.user;
  const channelId = message.channel;
  let queue = getQueue(channelId);

  if (!queue.includes(userId)) {
    await say(`<@${userId}> is not in the queue.`);
    return;
  }

  queue = queue.filter(id => id !== userId);
  setQueue(channelId, queue);
  const queueStatus = await formatQueueStatus(channelId, client);
  await say(`Removed <@${userId}> from the queue.\n${queueStatus}`);
});

// ⏭️ Skip command
app.message(/^(p|pass)$/i, async ({ message, context, say, client }) => {
  const userId =  message.user;
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
  const queueStatus = await formatQueueStatus(channelId, client);
  await say(`<@${userId}> has been skipped.\n${queueStatus}`);
});

// 📋 Queue status (manual check)
app.message(/^s|status$/i, async ({ message, say, client }) => {
  const queueStatus = await formatQueueStatus(message.channel, client);
  await say(queueStatus);
});

// 🧹 Clear command
app.message(/^clear$/i, async ({ message, say }) => {
  const userId = message.user;
  const channelId = message.channel;

  if (!allowedClearUsers.includes(userId)) {
    await say(`<@${userId}> you are not authorized to clear the queue.`);
    return;
  }

  let queue = getQueue(channelId);
  if (!queue || queue.length === 0) {
    await say(`The queue is already empty.`);
    return;
  }

  setQueue(channelId, []); // Empty the queue
  await say(`Queue has been cleared by <@${userId}>.`);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack Bot is running!');
})();