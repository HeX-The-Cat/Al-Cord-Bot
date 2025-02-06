require("dotenv").config();
const fs = require("fs");
const { Client, IntentsBitField, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, SlashCommandBuilder } = require("discord.js");
const cron = require("cron");

const path = "./src/data.json";

const readData = async () => {
  try {
    const data = await fs.promises.readFile(path, "utf8");
    return JSON.parse(data); // Parse the JSON string and return it
  } catch (err) {
    console.error("Error reading file:", err);
    return null;
  }
};

const writeData = async (data) => {
  try {
    await fs.promises.writeFile(path, JSON.stringify(data, null, 2), "utf8");
    console.log("Data updated successfully.");
  } catch (err) {
    console.error("Error writing to file:", err);
  }
};

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent],
});

// on initialization
client.on("ready", async () => {
  console.log(`${client.user.tag} is online.`);

  // register slash commands
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await guild.commands.set([
      new SlashCommandBuilder().setName("roles").setDescription("Send or edit the role selection embed on this channel"),
      new SlashCommandBuilder().setName("logoutbot").setDescription("Log out the bot"),
    ]);
    console.log("Slash commands registered.");
  }
});

// handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // ---- /roles command ----
  if (interaction.commandName === "roles") {
    //check role to be
    if (interaction.user.id !== process.env.ADMIN_USER_ID) {
      return interaction.reply({
        content: "You are not authorized to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true }); // Prevents the "bot is thinking..." response

    // Read current data from JSON
    const data = await readData();
    if (!data) {
      console.log("Failed to fetch data");
      return;
    }

    // Embed setup
    const embed = new EmbedBuilder()
      .setTitle("Smol Bluebirb's notification role selection:")
      .setDescription("Choose what you'd like to get notified for!")
      .addFields(
        {
          name: "Guild Shop Reset Reminder",
          value: "Get notified for Guild Shop reset.",
        },
        {
          name: "Weekend Claims Reminder",
          value: "Sunday reminder to claim your weekly supplies pack and task rewards before weekly reset.",
        },
        {
          name: "Operation Siren Reset Reminder",
          value: "Reminders for Operation Siren monthly reset for last 3 days of the month.",
        }
      )
      .setColor(0x008e44);

    // Buttons setup for the Embed
    const roleGuildShopReminder = new ButtonBuilder().setCustomId("roleGuildShopReminder").setLabel("Guild Shop Reminder").setStyle(ButtonStyle.Secondary);
    const roleWeekendReminder = new ButtonBuilder().setCustomId("roleWeekendReminder").setLabel("Weekend Reminder").setStyle(ButtonStyle.Secondary);
    const roleOpsiReminder = new ButtonBuilder().setCustomId("roleOpsiReminder").setLabel("OpSi Reminder").setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(roleGuildShopReminder, roleWeekendReminder, roleOpsiReminder);

    const channel = interaction.channel;

    // If embed ID exists, update the existing message
    if (data.embed) {
      try {
        const existingMessage = await channel.messages.fetch(data.embed);
        await existingMessage.edit({ embeds: [embed], components: [row] });
        console.log("Updated existing roles selection embed.");
      } catch (error) {
        console.log("Failed to find or update existing embed, sending a new one.");
        const sentMessage = await channel.send({ embeds: [embed], components: [row] });
        data.embed = sentMessage.id; // Store the new message ID in the JSON file
        await writeData(data); // Update the JSON file with the new embed ID
      }
    } else {
      // If no embed ID exists, send a new embed and save the ID
      const sentMessage = await channel.send({ embeds: [embed], components: [row] });
      data.embed = sentMessage.id;
      await writeData(data);
      console.log(
        `Embedded roles selection to "${interaction.guild.name}" id: ${interaction.guild.id}, channel "${interaction.channel.name}" id: ${interaction.channel.id}`
      );
    }
    await interaction.deleteReply(); // Hide the slash command reply
  }

  // ---- /logoutBot command ----
  if (interaction.commandName === "logoutbot") {
    if (interaction.user.id !== process.env.ADMIN_USER_ID) {
      return interaction.reply({
        content: "You are not authorized to use this command.",
        ephemeral: true,
      });
    }

    interaction.reply({
      content: `${client.user.tag} logging off`,
      ephemeral: true,
    });
    console.log(`${client.user.tag} logging off`);

    setTimeout(() => {
      client.destroy();
    }, 3000);
  }
});

// handle button interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // Role IDs
  const roleIdMap = {
    roleGuildShopReminder: process.env.ROLE_GUILD_SHOP,
    roleWeekendReminder: process.env.ROLE_WEEKEND,
    roleOpsiReminder: process.env.ROLE_OPSI,
  };

  const roleId = roleIdMap[interaction.customId];
  if (!roleId) return;

  const member = interaction.guild.members.cache.get(interaction.user.id);
  if (!member) {
    return interaction.reply({
      content: "Could not find member.",
      ephemeral: true,
    });
  }

  try {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.reply({
        content: `Removed role <@&${roleId}>`,
        ephemeral: true,
      });
      console.log(`Removed role ${interaction.customId} from ${interaction.user.tag}`);
    } else {
      await member.roles.add(roleId);
      await interaction.reply({
        content: `Added role <@&${roleId}>`,
        ephemeral: true,
      });
      console.log(`Added role ${interaction.customId} for ${interaction.user.tag}`);
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error assigning your role.",
      ephemeral: true,
    });
    console.log(`Error assigning role to ${interaction.user.tag}`);
  }
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
  if (message.author.id === process.env.ADMIN_USER_ID) {
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

const roleGuildShop = process.env.ROLE_GUILD_SHOP;
const roleWeekend = process.env.ROLE_WEEKEND;
const roleOpSi = process.env.ROLE_OPSI;

// CRON timers for AL cord

// guild shop reset reminder
const guildShopReminder = new cron.CronJob("0 10 * * 1,5", () => {
  const channel = client.channels.cache.get(process.env.NOTIFICATION_CHANNEL_ID);
  try {
    channel.send(`<@&${roleGuildShop}> Guild Shop has reset.`);
    console.log(`guildShopReminder run ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
  } catch (error) {
    console.log(`Failed to run guildShopReminder ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
    console.log(error.message);
  }
});

// weekly shop and task reminder
const weekendReminder = new cron.CronJob("0 10 * * 0", () => {
  const channel = client.channels.cache.get(process.env.NOTIFICATION_CHANNEL_ID);
  try {
    channel.send(`<@&${roleWeekend}> Last day to claim your Weekly Supplies Pack and Weekly Mission Rewards!`);
    console.log(`weekendReminder run ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
  } catch (error) {
    console.log(`Failed to run weekendReminder ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
    console.log(error.message);
  }
});

// OpSi monthly reset reminder
const opsiReminder = new cron.CronJob("0 10 * * *", () => {
  const channel = client.channels.cache.get(process.env.NOTIFICATION_CHANNEL_ID);
  const today = new Date();
  let oneAway = new Date();
  let twoAway = new Date();
  let threeAway = new Date();
  oneAway.setDate(oneAway.getDate() + 1);
  twoAway.setDate(twoAway.getDate() + 2);
  threeAway.setDate(threeAway.getDate() + 3);

  try {
    if (today.getMonth() != oneAway.getMonth()) {
      channel.send(`<@&${roleOpSi}> Last day until Operation Siren monthly reset!`);
      console.log(`opsiReminder1 run ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
    }
    if (today.getMonth() != twoAway.getMonth() && today.getMonth() == oneAway.getMonth()) {
      channel.send(`<@&${roleOpSi}> 2 days until Operation Siren monthly reset.`);
      console.log(`opsiReminder2 run ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
    }
    if (today.getMonth() != threeAway.getMonth() && today.getMonth() == twoAway.getMonth()) {
      channel.send(`<@&${roleOpSi}> 3 days until Operation Siren monthly reset.`);
      console.log(`opsiReminder3 run ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
    }
  } catch (error) {
    console.log(`Failed to run opsiReminder ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
    console.log(error.message);
  }
});

// clears chat every monday before daily reset
const channelCleaner = new cron.CronJob("59 9 * * 1", () => {
  try {
    async function clearChat(numb) {
      const channel = client.channels.cache.get(process.env.NOTIFICATION_CHANNEL_ID);
      const messageManager = channel.messages;
      const messages = await messageManager.channel.messages.fetch({
        limit: numb,
      });
      channel.bulkDelete(messages, true);
    }

    clearChat(10);
    console.log(`channelCleaner run ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
  } catch (error) {
    console.log(`Failed to run channelCleaner ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`);
    console.log(error.message);
  }
});

// start jobs
guildShopReminder.start();
console.log("guildShopReminder job started");

weekendReminder.start();
console.log("weekendReminder job started");

opsiReminder.start();
console.log("opsiReminder job started");

channelCleaner.start();
console.log("channelCleaner job started");

console.log("All jobs started");

client.login(process.env.BOT_TOKEN);
