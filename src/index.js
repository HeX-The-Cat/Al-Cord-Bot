require("dotenv").config();
const { Client, IntentsBitField } = require("discord.js");
const cron = require("cron");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

// on initialization
client.on("ready", (c) => {
  console.log(`${c.user.tag} is online.`);
});

// message commands
client.on("messageCreate", (message) => {
  // ignore message if sent by any bot
  if (message.author.bot) {
    return;
  }

  // commands for everyone to use
  if (message.content.toLowerCase() === "!tierlist") {
    message.reply("https://slaimuda.github.io/ectl/#/home");
  }
  if (message.content.toLocaleLowerCase() === "!wiki") {
    message.reply("https://azurlane.koumakan.jp/wiki/Azur_Lane_Wiki");
  }
  if (message.content.toLocaleLowerCase() === "!twitter") {
    message.reply("https://twitter.com/AzurLane_EN");
  }
  if (message.content.toLocaleLowerCase() === "!twitterjp") {
    message.reply("https://twitter.com/azurlane_staff");
  }

  // hex specific commands
  if (message.author.id === process.env.HEXID) {
    // stop jobs
    if (message.content === "!ALstop") {
      guildShopReminder.stop();

      weekendReminder.stop();

      opsiReminder.stop();

      channelCleaner.stop();

      message.reply("Jobs stopped");

      console.log("Jobs stopped");
    }

    //log out bot
    if (message.content === "!ALlogout") {
      console.log("Bot logging off");

      message.reply("Bot logging off");

      setTimeout(() => {
        client.destroy();
      }, 1000);
    }

    // clears 100 latest messages, mostly for test purposes, clean up test channel due to actual limitaitons of the func
    /*
        if (message.content === "!!clearchat") {
            async function clearChat (message, numb) {
                const channel = message.channel;
                const messageManager = channel.messages;
                const messages = await messageManager.channel.messages.fetch({ limit: numb });
                channel.bulkDelete(messages,true);
            }

          clearChat(message, 100);
        }
        */
  }
});

// Roles for cront jobs

const roleGuildShop = `<@&${"1157929080444948551"}>`;
const roleWeekend = `<@&${"1157929261714386945"}>`;
const roleOpSi = `<@&${"1157929315380510832"}>`;

// CRON timers for AL cord

// guild shop reset reminder
const guildShopReminder = new cron.CronJob("0 10 * * 1,5", () => {
  const channel = client.channels.cache.get(process.env.CHANNELID);
  try {
    channel.send(roleGuildShop + " Guild Shop has reset.");
    console.log("guildShopReminder run.");
  } catch (error) {
    console.log("Failed to run guildShopReminder");
    console.log(error.message);
  }
});

// weekly shop and task reminder
const weekendReminder = new cron.CronJob("0 10 * * 0", () => {
  const channel = client.channels.cache.get(process.env.CHANNELID);
  try {
    channel.send(
      roleWeekend +
        " Last day to claim your Weekly Supplies Pack and Weekly Mission Rewards."
    );
    console.log("weekendReminder run.");
  } catch (error) {
    console.log("Failed to run weekendReminder");
    console.log(error.message);
  }
});

// OpSi monthly reset reminder
const opsiReminder = new cron.CronJob("0 10 * * *", () => {
  const channel = client.channels.cache.get(process.env.CHANNELID);
  const today = new Date();
  let oneAway = new Date();
  let twoAway = new Date();
  let threeAway = new Date();
  oneAway.setDate(oneAway.getDate() + 1);
  twoAway.setDate(twoAway.getDate() + 2);
  threeAway.setDate(threeAway.getDate() + 3);

  try {
    if (today.getMonth() != oneAway.getMonth()) {
      channel.send(roleOpSi + " Last day until Operation Siren monthly reset!");

      console.log("opsiReminder1 run");
    }
    if (
      today.getMonth() != twoAway.getMonth() &&
      today.getMonth() == oneAway.getMonth()
    ) {
      channel.send(roleOpSi + " 2 days until Operation Siren monthly reset.");
      console.log("opsiReminder2 run");
    }
    if (
      today.getMonth() != threeAway.getMonth() &&
      today.getMonth() == twoAway.getMonth()
    ) {
      channel.send(roleOpSi + " 3 days until Operation Siren monthly reset.");
      console.log("opsiReminder3 run");
    }
  } catch (error) {
    console.log("Failed to run opsiReminder");
    console.log(error.message);
  }
});

// clears chat every monday before daily reset
const channelCleaner = new cron.CronJob("59 9 * * 1", () => {
  try {
    async function clearChat(numb) {
      const channel = client.channels.cache.get(process.env.CHANNELID);
      const messageManager = channel.messages;
      const messages = await messageManager.channel.messages.fetch({
        limit: numb,
      });
      channel.bulkDelete(messages, true);
    }

    clearChat(10);
    console.log("chat cleaner run");
  } catch (error) {
    console.log("Failed to run channelCleaner");
    console.log(error.message);
  }
});

// start jobs
guildShopReminder.start();
console.log("guildShopReminder started");

weekendReminder.start();
console.log("weekendReminder started");

opsiReminder.start();
console.log("opsiReminder started");

channelCleaner.start();
console.log("channelCleaner started");

console.log("All jobs started");

client.login(process.env.BOTTOKEN);
