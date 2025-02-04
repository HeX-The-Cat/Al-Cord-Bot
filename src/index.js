require("dotenv").config();
const {
  Client,
  IntentsBitField,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SlashCommandBuilder,
} = require("discord.js");
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
client.on("ready", async () => {
  console.log(`${client.user.tag} is online.`);

  // register slash commands
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await guild.commands.set([
      new SlashCommandBuilder()
        .setName("roles")
        .setDescription("Sends the role selection embed"),
      new SlashCommandBuilder()
        .setName("logoutbot")
        .setDescription("Log out the bot"),
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
          value:
            "Sunday reminder to claim your weekly supplies pack and task rewards before weekly reset.",
        },
        {
          name: "Operation Siren Reset Reminder",
          value:
            "Reminders for Operation Siren monthly reset for last 3 days of the month.",
        }
      )
      .setColor(0x3498db);

    const roleGuildShopReminder = new ButtonBuilder()
      .setCustomId("roleGuildShopReminder")
      .setLabel("Guild Shop Reminder")
      .setStyle(ButtonStyle.Secondary);
    const roleWeekendReminder = new ButtonBuilder()
      .setCustomId("roleWeekendReminder")
      .setLabel("Weekend Reminder")
      .setStyle(ButtonStyle.Secondary);
    const roleOpsiReminder = new ButtonBuilder()
      .setCustomId("roleOpsiReminder")
      .setLabel("OpSi Reminder")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(
      roleGuildShopReminder,
      roleWeekendReminder,
      roleOpsiReminder
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.deleteReply();
    console.log(
      `Embedded roles to "${interaction.guild.name}" id: ${interaction.guild.id}, channel "${interaction.channel.name}" id: ${interaction.channel.id}`
    );
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
    roleGuildShopReminder: "1157929080444948551",
    roleWeekendReminder: "1157929261714386945",
    roleOpsiReminder: "1157929315380510832",
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
      console.log(
        `Removed role ${interaction.customId} from ${interaction.user.tag}`
      );
    } else {
      await member.roles.add(roleId);
      await interaction.reply({
        content: `Added role <@&${roleId}>`,
        ephemeral: true,
      });
      console.log(
        `Added role ${interaction.customId} for ${interaction.user.tag}`
      );
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
  if (message.author.id === process.env.HEXID) {
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
    channel.send(`${roleGuildShop} Guild Shop has reset.`);
    console.log(
      `guildShopReminder run ${date.getDate()}.${
        date.getMonth() + 1
      }.${date.getFullYear()}`
    );
  } catch (error) {
    console.log(
      `Failed to run guildShopReminder ${date.getDate()}.${
        date.getMonth() + 1
      }.${date.getFullYear()}`
    );
    console.log(error.message);
  }
});

// weekly shop and task reminder
const weekendReminder = new cron.CronJob("0 10 * * 0", () => {
  const channel = client.channels.cache.get(process.env.CHANNELID);
  try {
    channel.send(
      `${roleWeekend} Last day to claim your Weekly Supplies Pack and Weekly Mission Rewards.`
    );
    console.log(
      `weekendReminder run ${date.getDate()}.${
        date.getMonth() + 1
      }.${date.getFullYear()}`
    );
  } catch (error) {
    console.log(
      `Failed to run weekendReminder ${date.getDate()}.${
        date.getMonth() + 1
      }.${date.getFullYear()}`
    );
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
      channel.send(`${roleOpSi} Last day until Operation Siren monthly reset!`);
      console.log(
        `opsiReminder1 run ${date.getDate()}.${
          date.getMonth() + 1
        }.${date.getFullYear()}`
      );
    }
    if (
      today.getMonth() != twoAway.getMonth() &&
      today.getMonth() == oneAway.getMonth()
    ) {
      channel.send(`${roleOpSi} 2 days until Operation Siren monthly reset.`);
      console.log(
        `opsiReminder2 run ${date.getDate()}.${
          date.getMonth() + 1
        }.${date.getFullYear()}`
      );
    }
    if (
      today.getMonth() != threeAway.getMonth() &&
      today.getMonth() == twoAway.getMonth()
    ) {
      channel.send(`${roleOpSi} 3 days until Operation Siren monthly reset.`);
      console.log(
        `opsiReminder3 run ${date.getDate()}.${
          date.getMonth() + 1
        }.${date.getFullYear()}`
      );
    }
  } catch (error) {
    console.log(
      `Failed to run opsiReminder ${date.getDate()}.${
        date.getMonth() + 1
      }.${date.getFullYear()}`
    );
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
    console.log(
      `channelCleaner run ${date.getDate()}.${
        date.getMonth() + 1
      }.${date.getFullYear()}`
    );
  } catch (error) {
    console.log(
      `Failed to run channelCleaner ${date.getDate()}.${
        date.getMonth() + 1
      }.${date.getFullYear()}`
    );
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
