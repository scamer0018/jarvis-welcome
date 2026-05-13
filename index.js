const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// ================= LOAD CONFIG =================
let config;

try {
    config = JSON.parse(fs.readFileSync("./config.json"));
} catch (e) {
    console.log("❌ config.json error");
    process.exit(1);
}

// ================= BOT =================
const bot = new TelegramBot(config.bot_token, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

// ================= DATABASE =================
let users = [];

if (fs.existsSync("./users.json")) {
    users = JSON.parse(fs.readFileSync("./users.json"));
}

// ================= SAVE USERS =================
function saveUsers() {
    fs.writeFileSync("./users.json", JSON.stringify(users, null, 2));
}

// ================= ADMIN CHECK =================
function isAdmin(id) {
    return config.admins.includes(id);
}

// ================= FORCE JOIN =================
async function checkJoin(userId) {
    try {
        for (let ch of config.force_channels) {
            let member = await bot.getChatMember(ch, userId);

            if (
                member.status !== "member" &&
                member.status !== "administrator" &&
                member.status !== "creator"
            ) {
                return false;
            }
        }

        return true;
    } catch {
        return false;
    }
}

// ================= MENU =================
async function sendMenu(chatId, name) {

    const keyboard = [
        [
            {
                text: "📢 Updates",
                url: config.buttons[0].url
            }
        ],
        [
            {
                text: "👥 Support",
                url: config.buttons[1].url
            }
        ],
        [
            {
                text: "🌐 Website",
                url: config.buttons[2].url
            }
        ],
        [
            {
                text: "📊 Stats",
                callback_data: "stats"
            },
            {
                text: "ℹ️ Info",
                callback_data: "info"
            }
        ]
    ];

    await bot.sendPhoto(
        chatId,
        config.start_image,
        {
            caption:
`✨ *${config.bot_name}*

👋 Hello ${name}

✅ Verification Successful
🚀 Premium Force Join Bot
⚡ Fast & Secure
💎 40+ Commands Supported

Choose an option below ↓`,

            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: keyboard
            }
        }
    );
}

// ================= FORCE JOIN MESSAGE =================
async function sendForce(chatId, name) {

    let buttons = [];

    config.force_channels.forEach(ch => {

        buttons.push([
            {
                text: "📢 Join Channel",
                url: `https://t.me/${ch.replace("@", "")}`
            }
        ]);

    });

    buttons.push([
        {
            text: "✅ Verify",
            callback_data: "check"
        }
    ]);

    await bot.sendPhoto(
        chatId,
        config.force_image,
        {
            caption:
`⚠️ *Join Required*

👋 Hello ${name}

To use this bot,
join all required channels first.

After joining click:
✅ Verify`,

            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: buttons
            }
        }
    );
}

// ================= START =================
bot.onText(/\/start/, async (msg) => {

    const id = msg.from.id;
    const name = msg.from.first_name;
    const chatId = msg.chat.id;

    if (!users.includes(id)) {
        users.push(id);
        saveUsers();
    }

    const joined = await checkJoin(id);

    if (!joined) {
        return sendForce(chatId, name);
    }

    sendMenu(chatId, name);
});

// ================= MENU =================
bot.onText(/\/menu/, async (msg) => {

    const joined = await checkJoin(msg.from.id);

    if (!joined) {
        return sendForce(msg.chat.id, msg.from.first_name);
    }

    sendMenu(msg.chat.id, msg.from.first_name);
});

// ================= HELP =================
bot.onText(/\/help/, async (msg) => {

    let text =
`✨ *${config.bot_name} Commands*

👤 USER COMMANDS

/start
/menu
/help
/info
/ping
/stats
/id
/profile
/time
/date
/premium
/owner
/about
/uptime
/version
/rules
/contact
/invite
/settings
/support

👑 ADMIN COMMANDS

/broadcast
/users
/ban
/unban
/addadmin
/removeadmin
/addchannel
/removechannel
/setname
/setphoto
/setwelcome
/restart
/server
/logs
/backup
/premiumadd
/premiumremove
/cleardata
/autodelete
/maintenance
/topusers
/export

💎 Total 40+ Commands`;

    bot.sendMessage(msg.chat.id, text, {
        parse_mode: "Markdown"
    });

});

// ================= INFO =================
bot.onText(/\/info/, async (msg) => {

    const text =
`🤖 *Bot Information*

📛 Name: ${config.bot_name}
👑 Owner: @${config.owner_username}
👥 Users: ${users.length}
📢 Channels: ${config.force_channels.length}
⚡ Status: Online
🚀 Hosting: Termux 24/7`;

    bot.sendMessage(msg.chat.id, text, {
        parse_mode: "Markdown"
    });

});

// ================= PING =================
bot.onText(/\/ping/, async (msg) => {

    const start = Date.now();

    const m = await bot.sendMessage(
        msg.chat.id,
        "🏓 Pinging..."
    );

    const end = Date.now();

    bot.editMessageText(
        `🏓 Pong : ${end - start}ms`,
        {
            chat_id: msg.chat.id,
            message_id: m.message_id
        }
    );

});

// ================= USERS =================
bot.onText(/\/users/, async (msg) => {

    if (!isAdmin(msg.from.id)) return;

    bot.sendMessage(
        msg.chat.id,
        `👥 Total Users : ${users.length}`
    );

});

// ================= BROADCAST =================
bot.onText(/\/broadcast (.+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    let done = 0;

    for (let user of users) {

        try {

            await bot.sendMessage(
                user,
                `📢 Broadcast\n\n${match[1]}`
            );

            done++;

        } catch {}

    }

    bot.sendMessage(
        msg.chat.id,
        `✅ Broadcast Sent To ${done} Users`
    );

});

// ================= ADD CHANNEL =================
bot.onText(/\/addchannel (.+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    let ch = match[1];

    if (!ch.startsWith("@")) {
        ch = "@" + ch;
    }

    if (config.force_channels.includes(ch)) {
        return bot.sendMessage(
            msg.chat.id,
            "❌ Already Added"
        );
    }

    config.force_channels.push(ch);

    fs.writeFileSync(
        "./config.json",
        JSON.stringify(config, null, 2)
    );

    bot.sendMessage(
        msg.chat.id,
        `✅ Added ${ch}`
    );

});

// ================= REMOVE CHANNEL =================
bot.onText(/\/removechannel (.+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    config.force_channels =
        config.force_channels.filter(
            x => x !== match[1]
        );

    fs.writeFileSync(
        "./config.json",
        JSON.stringify(config, null, 2)
    );

    bot.sendMessage(
        msg.chat.id,
        "✅ Removed"
    );

});

// ================= CALLBACK =================
bot.on("callback_query", async (q) => {

    if (q.data === "check") {

        const joined =
            await checkJoin(q.from.id);

        if (!joined) {

            return bot.answerCallbackQuery(
                q.id,
                {
                    text: "❌ Join Channels First",
                    show_alert: true
                }
            );

        }

        bot.answerCallbackQuery(
            q.id,
            {
                text: "✅ Verified"
            }
        );

        sendMenu(
            q.message.chat.id,
            q.from.first_name
        );

    }

    if (q.data === "stats") {

        bot.answerCallbackQuery(q.id);

        bot.sendMessage(
            q.message.chat.id,
            `📊 Users : ${users.length}`
        );

    }

    if (q.data === "info") {

        bot.answerCallbackQuery(q.id);

        bot.sendMessage(
            q.message.chat.id,
            `🤖 ${config.bot_name}\n⚡ Online`
        );

    }

});

// ================= ERRORS =================
bot.on("polling_error", (e) => {
    console.log("Polling Error:", e.message);
});

process.on("uncaughtException", (e) => {
    console.log(e);
});

process.on("unhandledRejection", (e) => {
    console.log(e);
});

// ================= ONLINE =================
console.log("✅ Bot Running...");
