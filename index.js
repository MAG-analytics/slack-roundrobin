// index.js
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

let queue = ['@Fengyu Xu', '@Ryan DeBruyne', '@Cade Kaftel', '@Michael Loff'];

app.message(/^lead$/, async ({ message, say }) => {
  const user = `<@${message.user}>`;
  if (user !== queue[0]) {
    await say(`${user}, it's not your turn yet! ${queue[0]} is on duty.`);
    return;
  }

  await say(`${user} handled a lead. ${queue[1]} is now on duty!`);
  queue.push(queue.shift()); // rotate queue
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack Bot is running!');
})();