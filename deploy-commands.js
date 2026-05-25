require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('ヘルプを表示'),

    new SlashCommandBuilder()
        .setName('getpoint')
        .setDescription('ポイントを獲得'),

    new SlashCommandBuilder()
        .setName('lv')
        .setDescription('現在のレベル表示'),

    new SlashCommandBuilder()
        .setName('get')
        .setDescription('ロール報酬を受け取る')

].map(command => command.toJSON());

const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);

(async () => {

    try {

        console.log('スラッシュコマンド登録中...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log('登録完了！');

    } catch (error) {

        console.error(error);

    }

})();