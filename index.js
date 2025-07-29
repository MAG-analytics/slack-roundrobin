// index.js
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true
});

let queue = ['U06KSH5H8FR', 'U014NGAJTFT', 'U013V5LEG3Z', 'U0149TEARJ6'];

app.message(/^lead$/, async ({ message, say }) => {
console.log(`Lead handler triggered by user: ${message.user}`);
  const user = message.user;

  if (user !== queue[0]) {
    await say(`<@${user}>, it's not your turn yet! <@${queue[0]}> is on duty.`);
    return;
  }

  await say(`<@${user}> handled a lead. <@${queue[1]}> is now on duty!`);
  queue.push(queue.shift());
});

app.message(/^status$/, async ({ message, say }) => {
  console.log(`Status handler triggered by user: ${message.user}`);
  const queueStatus = queue.map((userId, index) => `${index + 1}. <@${userId}>`).join('\n');
  await say(`Current queue:\n${queueStatus}`);
});


(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack Bot is running!');
})();