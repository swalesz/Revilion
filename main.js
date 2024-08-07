const { Client, GatewayIntentBits, REST, Routes, Events, Collection } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('A / jeles parancsok frissítése elkezdődött.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('A / jeles parancsok frissítése befejeződött.');
    } catch (error) {
        console.error(error);
    }
})();

const WELCOME_CHANNEL_ID = '1259815661824380928';
const WELCOME_MESSAGE = 'Szia {member}! Érezd jól magad :)';
const AUTOMATIC_ROLE_ID = '1260639636598947841';
const ALLOWED_GUILD_ID = '1259815207841304678';

client.once(Events.ClientReady, async () => {
    console.log(`A bot sikeresen elindult`);
    // Fetch all members to ensure cache is populated
    await client.guilds.fetch();
    const guild = client.guilds.cache.get(ALLOWED_GUILD_ID);
    if (guild) {
        await guild.members.fetch();
        console.log('Minden tag sikeresen fetch-elődött.');
    } else {
        console.log('A megadott szerver nem található.');
    }
});

client.on('guildMemberAdd', async member => {
    console.log(`Új tag csatlakozott: ${member.user.tag}`);

    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
        await channel.send(WELCOME_MESSAGE.replace('{member}', member));
    } else {
        console.log('A csatorna nem található');
    }

    const role = member.guild.roles.cache.get(AUTOMATIC_ROLE_ID);
    if (role) {
        await member.roles.add(role);
        console.log(`${role.name} rang hozzáadva ${member.user.tag} felhasználónak`);
    } else {
        console.log('A rang nem található');
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.guildId !== ALLOWED_GUILD_ID) {
        await interaction.reply({ content: "Ez a bot csak a meghatározott szerveren használható.", ephemeral: true });
        return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Hiba történt a parancs végrehajtása közben!', ephemeral: true });
    }
});

client.login(token);
