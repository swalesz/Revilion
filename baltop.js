const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../economy.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, balance INTEGER DEFAULT 0, last_work TEXT, TEXT,last_daily TEXT,job TEXT)`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('baltop')
        .setDescription('Toplista megtekintése')
        .addIntegerOption(option =>
            option.setName('oldal')
                .setDescription('A megtekinteni kívánt oldal száma')
                .setRequired(false)
        ),
    async execute(interaction) {
        const page = interaction.options.getInteger('oldal') || 1;
        const usersPerPage = 10;

        db.all('SELECT user_id, balance FROM users ORDER BY balance DESC', async (err, rows) => {
            if (err) {
                console.error(err.message);
                return;
            }
            const totalPages = Math.ceil(rows.length / usersPerPage);

            if (page < 1 || page > totalPages) {
                const embed = new EmbedBuilder()
                    .setTitle('Helytelen használat')
                    .setDescription(`Érvénytelen oldal.\nKérlek válassz egy oldalt a(z) 1. és a(z) ${totalPages} között.`)
                    .setColor(0xff0000);
                interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            const startIndex = (page - 1) * usersPerPage;
            const endIndex = startIndex + usersPerPage;
            const leaderboard = rows.slice(startIndex, endIndex);

            const embed = new EmbedBuilder()
                .setTitle(`Érme Toplista - ${page}. oldal`)
                .setColor(0x00ff00);

            const promises = leaderboard.map(async (user, index) => {
                let displayName = `Unknown User`;
                try {
                    console.log(`Processing user ID: ${user.user_id}, balance: ${user.balance}`);
                    let member = interaction.guild.members.cache.get(user.user_id);
                    if (!member) {
                        console.log(`Member with ID ${user.user_id} not found in cache, attempting to fetch...`);
                        member = await interaction.guild.members.fetch(user.user_id).catch(err => {
                            console.error(`Error fetching member with ID ${user.user_id}:`, err);
                            return null;
                        });
                    }
                    if (member && member.user) {
                        displayName = member.user.username;
                        console.log(`Found user: ${displayName}`);
                    } else {
                        console.log(`User with ID ${user.user_id} not found`);
                    }
                } catch (err) {
                    console.error(`Error processing member with ID ${user.user_id}:`, err);
                }
                embed.addFields({
                    name: `${startIndex + index + 1}. ${displayName}`,
                    value: `${user.balance} érme`,
                    inline: false,
                });
            });

            await Promise.all(promises);

            embed.setFooter({ text: `Oldal ${page} a ${totalPages} oldalból` });
            interaction.reply({ embeds: [embed] });
        });
    }
};
