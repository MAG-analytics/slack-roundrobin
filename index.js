const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true
});

let queue = ['U06KSH5H8FR', 'U014NGAJTFT', 'U013V5LEG3Z', 'U0149TEARJ6'];

async function react({ client, channel, ts, name = 'white_check_mark' }) {
  try {
    await client.reactions.add({
      channel,
      name,
      timestamp: ts
    });
  } catch (err) {
    console.error('Failed to add reaction:', err.data?.error || err.message);
  }
}

app.message(/^(l|lead)$/i, async ({ message, say, client }) => {
  const user = message.user;
  const channel = message.channel;
  const ts = message.ts;

  console.log(`Lead handler triggered by user: ${user}`);

  try {
    // React to the message
    await react({ client, channel, ts });

    if (user !== queue[0]) {
      await say(`<@${user}>, it's not your turn yet! <@${queue[0]}> is on duty.`);
      return;
    }

    // Rotate the queue
    queue.push(queue.shift());

    // Build mention list
    const next1 = queue[0] ? `<@${queue[0]}>` : 'N/A';
    const next2 = queue[1] ? `<@${queue[1]}>` : 'N/A';

    // Get plain-text names (usernames or real names)
    const nameList = await Promise.all(
      queue.map(async (userId) => {
        try {
          const res = await client.users.info({ user: userId });
          return res.user?.real_name || res.user?.name || userId;
        } catch (e) {
          console.error(`Failed to fetch name for ${userId}:`, e);
          return userId;
        }
      })
    );

    const plainQueue = nameList.join(" → ");

    await say(
      `<@${user}> has claimed a lead.\n${next1}, it’s your turn. ${next2}, you will be next.\n\n📋 *Lead Queue*: ${plainQueue}`
    );
  } catch (error) {
    console.error("Error handling lead message:", error);
    await say("Oops! Something went wrong while handling the lead.");
  }
});

app.message(/^(r|remove)$/i, async ({ message, say, client }) => {
  const user = message.user;
  console.log(`Remove handler triggered by user: ${user}`);

  await react({ client, channel: message.channel, ts: message.ts });

  if (!queue.includes(user)) {
    await say(`<@${user}>, you're not currently in the queue.`);
    return;
  }

  queue = queue.filter(u => u !== user);
  await say(`<@${user}> has been removed from the queue.`);
});

app.message(/^(a|add)$/i, async ({ message, say, client }) => {
  const user = message.user;
  console.log(`Add handler triggered by user: ${user}`);

  await react({ client, channel: message.channel, ts: message.ts });

  if (queue.includes(user)) {
    await say(`<@${user}>, you're already in the queue.`);
    return;
  }

  queue.push(user);
  await say(`<@${user}> has been added to the end of the queue.`);
});

app.message(/^(s|skip)$/i, async ({ message, say, client }) => {
  const user = message.user;
  const channel = message.channel;
  const ts = message.ts;

  console.log(`Skip handler triggered by user: ${user}`);


  await react({ client, channel, ts });

  const index = queue.indexOf(user);

  if (index === -1) {
    await say(`<@${user}>, you are not currently in the queue.`);
    return;
  }

  // Remove user from current position and push to the end
  queue.splice(index, 1);
  queue.push(user);

  await say(`<@${user}> skipped the round and was moved to the end of the queue.`);
});


app.message(/^status$/i, async ({ message, say, client }) => {
  console.log(`Status handler triggered by user: ${message.user}`);

  await react({ client, channel: message.channel, ts: message.ts });

  const queueStatus = queue.map((userId, index) => `${index + 1}. <@${userId}>`).join('\n');
  await say(`📋 Current queue:\n${queueStatus}`);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack Bot is running!');
})();
