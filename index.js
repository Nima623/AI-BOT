process.stdout.setEncoding('utf8');

require('dotenv').config();

const {
    Client,
    GatewayIntentBits
} = require('discord.js');

const {
    GoogleGenerativeAI
} = require('@google/generative-ai');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
});

// 会話記録
const memory = {};

// レベルデータ
const userData = {};

// 報酬取得記録
const rewardData = {};

client.on('clientReady', () => {

    console.log(`${client.user.tag} 起動!`);

});

// =========================
// スラッシュコマンド
// =========================

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isChatInputCommand()) return;

    const userId = interaction.user.id;

    // 初期化
    if (!userData[userId]) {

        userData[userId] = {
            points: 0,
            level: 1,
            lastGetPoint: 0
        };

    }

    if (!rewardData[userId]) {
        rewardData[userId] = [];
    }

    // =========================
    // /help
    // =========================

    if (interaction.commandName === 'help') {

        return interaction.reply({
            content:
                "このAIBotは、メンションすると返信が返ってきます。\nもし不安な点などがありましたら、作成者、@Hiromu0623. にご相談ください。",
            flags: 64
        });

    }

    // =========================
    // /lv
    // =========================

    if (interaction.commandName === 'lv') {

        return interaction.reply({
            content:
                `現在のレベルは Lv.${userData[userId].level} です！\nポイント: ${userData[userId].points}`,
            flags: 64
        });

    }

    // =========================
    // /getpoint
    // =========================

    if (interaction.commandName === 'getpoint') {

        const now = Date.now();

        const cooldown =
            24 * 60 * 60 * 1000;

        const diff =
            now - userData[userId].lastGetPoint;

        // クールダウン中
        if (diff < cooldown) {

            const remain =
                cooldown - diff;

            let timeText = "";

            const hours =
                Math.floor(remain / 3600000);

            const minutes =
                Math.floor(
                    (remain % 3600000) / 60000
                );

            const seconds =
                Math.floor(
                    (remain % 60000) / 1000
                );

            if (hours > 0) {

                timeText = `${hours}時間`;

                if (minutes > 0) {
                    timeText += `${minutes}分`;
                }

            } else if (minutes > 0) {

                timeText = `${minutes}分`;

            } else {

                timeText = `${seconds}秒`;

            }

            return interaction.reply({
                content:
                    `次受け取れるまで： ${timeText}後`,
                flags: 64
            });

        }

        // ポイント追加
        userData[userId].lastGetPoint = now;

        userData[userId].points += 50;

        // レベル計算
        const oldLevel =
            userData[userId].level;

        const newLevel =
            Math.floor(
                userData[userId].points / 150
            ) + 1;

        userData[userId].level =
            newLevel;

        await interaction.reply({
            content:
                "ポイント50ポイント獲得!",
            flags: 64
        });

        // レベルアップ
        if (newLevel > oldLevel) {

            interaction.channel.send(
                `${interaction.user.username}さんが${newLevel}レベルになりました!!`
            );

        }

        return;

    }

    // =========================
    // /get
    // =========================

    if (interaction.commandName === 'get') {

        const level =
            userData[userId].level;

        const guild =
            interaction.guild;

        // =========================
        // Lv20 達人
        // =========================

        if (
            level >= 20 &&
            !rewardData[userId].includes("達人")
        ) {

            let role =
                guild.roles.cache.find(
                    r => r.name === "達人"
                );

            if (!role) {

                role = await guild.roles.create({
                    name: "達人",
                    color: "Gold"
                });

            }

            await interaction.member.roles.add(role);

            rewardData[userId].push("達人");

            interaction.channel.send(
                `${interaction.user.username}さんが達人のロールが付与されました!`
            );

            return;

        }

        // =========================
        // Lv10 初段
        // =========================

        if (
            level >= 10 &&
            !rewardData[userId].includes("初段")
        ) {

            let role =
                guild.roles.cache.find(
                    r => r.name === "初段"
                );

            if (!role) {

                role = await guild.roles.create({
                    name: "初段",
                    color: "Blue"
                });

            }

            await interaction.member.roles.add(role);

            rewardData[userId].push("初段");

            return interaction.reply({
                content:
                    "初段のロールが付与されました!",
                flags: 64
            });

        }

        // =========================
        // Lv5 5級
        // =========================

        if (
            level >= 5 &&
            !rewardData[userId].includes("5級")
        ) {

            let role =
                guild.roles.cache.find(
                    r => r.name === "5級"
                );

            if (!role) {

                role = await guild.roles.create({
                    name: "5級",
                    color: "Green"
                });

            }

            await interaction.member.roles.add(role);

            rewardData[userId].push("5級");

            return interaction.reply({
                content:
                    "5級のロールが付与されました!",
                flags: 64
            });

        }

        // 足りない
        if (level < 5) {

            return interaction.reply({
                content:
                    `残り${5 - level}レベルでロールがもらえます!`,
                flags: 64
            });

        }

        return interaction.reply({
            content:
                "受け取れるロールはありません!",
            flags: 64
        });

    }

});

// =========================
// AI返信
// =========================

client.on('messageCreate', async (message) => {

    // Bot無視
    if (message.author.bot) return;

    // メンションされた時
    if (message.mentions.has(client.user)) {

        const userId =
            message.author.id;

        const userMessage =
            message.content
                .replace(`<@${client.user.id}>`, '')
                .replace(`<@!${client.user.id}>`, '')
                .trim();

        if (!userMessage) {

            return message.reply(
                "何か話しかけて！"
            );

        }

        try {

            await message.channel.sendTyping();

            // メモリ作成
            if (!memory[userId]) {
                memory[userId] = [];
            }

            // 会話保存
            memory[userId].push({
                role: "user",
                parts: [
                    {
                        text: userMessage
                    }
                ]
            });

            // 最大20件
            if (
                memory[userId].length > 20
            ) {
                memory[userId].shift();
            }

            // AI生成
            const result =
                await model.generateContent({
                    contents:
                        memory[userId]
                });

            let response =
                result.response.text();

            // 不自然な文章削除
            response = response
                .replace(
                    /何かお手伝いできることはありますか？/g,
                    ""
                )
                .replace(
                    /お手伝いできることがあれば教えてください。/g,
                    ""
                );

            // AI返信保存
            memory[userId].push({
                role: "model",
                parts: [
                    {
                        text: response
                    }
                ]
            });

            // 返信
            await message.reply(response);

        } catch (error) {

            console.error(error);

            message.reply(
                "エラーが発生しました..."
            );

        }

    }

});

// ログイン
client.login(process.env.DISCORD_TOKEN);

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Web server ready on port ${PORT}`);
});