const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const os = require("os");

// ================= CONFIG =================

let config;

try {
    config = JSON.parse(fs.readFileSync("./config.json"));
} catch (e) {
    console.log("❌ CONFIG ERROR");
    process.exit(1);
}

// ================= BOT =================

const bot = new TelegramBot(config.bot_token, {
    polling: true
});

// ================= DATABASE =================

let users = [];
let bannedUsers = [];
let premiumUsers = [];
let warnings = {};
let maintenanceMode = false;

const startTime = Date.now();

// ================= FILES =================

const FILES = {
    users: "./users.json",
    banned: "./banned.json",
    premium: "./premium.json",
    warnings: "./warnings.json"
};

// ================= LOAD =================

function load(file, def) {

    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(def, null, 2));
        return def;
    }

    try {
        return JSON.parse(fs.readFileSync(file));
    } catch {
        return def;
    }
}

users = load(FILES.users, []);
bannedUsers = load(FILES.banned, []);
premiumUsers = load(FILES.premium, []);
warnings = load(FILES.warnings, {});

// ================= SAVE =================

function save(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ================= FUNCTIONS =================

function isAdmin(id) {
    return config.admins.includes(id);
}

function isPremium(id) {
    return premiumUsers.includes(id);
}

function uptime() {

    const total = Math.floor((Date.now() - startTime) / 1000);

    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return `${d}D ${h}H ${m}M ${s}S`;
}

function box(text) {

    return `
╔════════════════════╗
     💎 PREMIUM BOT 💎
╚════════════════════╝

${text}

╔════════════════════╗
      ⚡ ULTRA FAST ⚡
╚════════════════════╝`;
}

async function send(chatId, text, options = {}) {

    try {

        return await bot.sendMessage(
            chatId,
            text,
            options
        );

    } catch {}
}

// ================= FORCE JOIN =================

async function checkJoin(userId) {

    try {

        for (let ch of config.force_channels) {

            const member = await bot.getChatMember(
                ch,
                userId
            );

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

// ================= FORCE MSG =================

async function sendForce(chatId, name) {

    let btns = [];

    config.force_channels.forEach(ch => {

        btns.push([
            {
                text: "📢 JOIN CHANNEL",
                url: `https://t.me/${ch.replace("@", "")}`
            }
        ]);
    });

    btns.push([
        {
            text: "✅ VERIFY",
            callback_data: "verify"
        }
    ]);

    await bot.sendPhoto(
        chatId,
        config.force_image,
        {
            caption:
`╔════════════════════╗
      🔐 VERIFICATION 🔐
╚════════════════════╝

👋 Hello ${name}

📢 Join All Channels
⚡ Then Click Verify

╔════════════════════╗
      💎 PREMIUM 💎
╚════════════════════╝`,
            reply_markup: {
                inline_keyboard: btns
            }
        }
    );
}

// ================= MENU =================

async function menu(chatId, name) {

    const keyboard = [
        [
            {
                text: "📊 STATS",
                callback_data: "stats"
            },
            {
                text: "ℹ️ INFO",
                callback_data: "info"
            }
        ],
        [
            {
                text: "👑 PREMIUM",
                callback_data: "premium"
            }
        ]
    ];

    await bot.sendPhoto(
        chatId,
        config.start_image,
        {
            caption:
`╔════════════════════╗
     💎 ${config.bot_name} 💎
╚════════════════════╝

👋 Welcome ${name}

✅ Verification Successful
⚡ 40+ Premium Commands
🚀 24/7 Online
🛡 Secure Force Join
💎 Premium UI System

Type /help

╔════════════════════╗
      👑 ENJOY 👑
╚════════════════════╝`,
            reply_markup: {
                inline_keyboard: keyboard
            }
        }
    );
}

// ================= START =================

bot.onText(/\/start/, async (msg) => {

    const id = msg.from.id;

    if (maintenanceMode && !isAdmin(id)) {

        return send(
            msg.chat.id,
            "🛠 BOT UNDER MAINTENANCE"
        );
    }

    if (bannedUsers.includes(id)) {

        return send(
            msg.chat.id,
            "🚫 YOU ARE BANNED"
        );
    }

    if (!users.includes(id)) {

        users.push(id);

        save(FILES.users, users);
    }

    const joined = await checkJoin(id);

    if (!joined) {

        return sendForce(
            msg.chat.id,
            msg.from.first_name
        );
    }

    menu(
        msg.chat.id,
        msg.from.first_name
    );
});

// ================= HELP =================

bot.onText(/\/help/, async (msg) => {

    send(msg.chat.id,
box(`👤 USER COMMANDS

/start → Start Bot
/menu → Open Menu
/help → Commands List
/info → Bot Information
/ping → Bot Speed
/stats → Bot Stats
/id → Your Telegram ID
/profile → Your Profile
/time → Current Time
/date → Current Date
/premium → Premium Info
/owner → Owner Username
/about → About Bot
/uptime → Bot Uptime
/version → Bot Version
/rules → Bot Rules
/contact → Contact Owner
/support → Support
/invite → Invite Friends

👑 ADMIN COMMANDS

/users
/broadcast TEXT
/ban ID
/unban ID
/premiumadd ID
/premiumremove ID
/addadmin ID
/removeadmin ID
/addchannel @channel
/removechannel @channel
/server
/restart
/backup
/export
/topusers
/maintenance on/off

📖 COMMAND GUIDE

Example:
/ban 123456789
/broadcast Hello Users
/premiumadd 123456789`)
    );
});

// ================= USER COMMANDS =================

bot.onText(/\/menu/, async (msg) => {
    menu(msg.chat.id, msg.from.first_name);
});

bot.onText(/\/info/, async (msg) => {

    send(msg.chat.id,
box(`📛 NAME : ${config.bot_name}

👥 USERS : ${users.length}
⭐ PREMIUM : ${premiumUsers.length}
👑 ADMINS : ${config.admins.length}

⚡ STATUS : ONLINE
🚀 HOST : TERMUX 24/7`)
    );
});

bot.onText(/\/ping/, async (msg) => {

    const start = Date.now();

    const m = await send(
        msg.chat.id,
        "🏓 PINGING..."
    );

    const end = Date.now();

    bot.editMessageText(
        `⚡ PONG : ${end - start}ms`,
        {
            chat_id: msg.chat.id,
            message_id: m.message_id
        }
    );
});

bot.onText(/\/stats/, async (msg) => {

    send(msg.chat.id,
box(`👥 USERS : ${users.length}

⭐ PREMIUM : ${premiumUsers.length}

🚫 BANNED : ${bannedUsers.length}`)
    );
});

bot.onText(/\/id/, async (msg) => {

    send(
        msg.chat.id,
        `🆔 YOUR ID : ${msg.from.id}`
    );
});

bot.onText(/\/profile/, async (msg) => {

    send(msg.chat.id,
box(`👤 NAME : ${msg.from.first_name}

🆔 ID : ${msg.from.id}

🌍 USERNAME : @${msg.from.username || "none"}

⭐ PREMIUM : ${isPremium(msg.from.id) ? "YES" : "NO"}

👑 ADMIN : ${isAdmin(msg.from.id) ? "YES" : "NO"}`)
    );
});

bot.onText(/\/time/, async (msg) => {

    send(
        msg.chat.id,
        `⏰ TIME : ${new Date().toLocaleTimeString()}`
    );
});

bot.onText(/\/date/, async (msg) => {

    send(
        msg.chat.id,
        `📅 DATE : ${new Date().toDateString()}`
    );
});

bot.onText(/\/premium/, async (msg) => {

    send(msg.chat.id,
box(`⭐ PREMIUM BENEFITS

⚡ Fast Access
💎 VIP Status
🚀 No Limits
🛡 Premium Support

👑 OWNER :
@${config.owner_username}`)
    );
});

bot.onText(/\/owner/, async (msg) => {

    send(
        msg.chat.id,
        `👑 OWNER : @${config.owner_username}`
    );
});

bot.onText(/\/about/, async (msg) => {

    send(msg.chat.id,
box(`🤖 PREMIUM FORCE JOIN BOT

⚡ Ultra Fast
🚀 Secure System
💎 Premium UI
🛡 24/7 Online`)
    );
});

bot.onText(/\/uptime/, async (msg) => {

    send(
        msg.chat.id,
        `⏱ UPTIME : ${uptime()}`
    );
});

bot.onText(/\/version/, async (msg) => {

    send(
        msg.chat.id,
        `🚀 VERSION : v5 Premium`
    );
});

bot.onText(/\/rules/, async (msg) => {

    send(msg.chat.id,
box(`📜 RULES

❌ No Spam
❌ No Abuse
✅ Respect Everyone`)
    );
});

bot.onText(/\/contact/, async (msg) => {

    send(
        msg.chat.id,
        `📞 CONTACT : @${config.owner_username}`
    );
});

bot.onText(/\/invite/, async (msg) => {

    send(
        msg.chat.id,
        "🔗 SHARE THIS BOT WITH FRIENDS"
    );
});

bot.onText(/\/support/, async (msg) => {

    send(
        msg.chat.id,
        `🛠 SUPPORT : @${config.owner_username}`
    );
});

// ================= ADMIN =================

bot.onText(/\/users/, async (msg) => {

    if (!isAdmin(msg.from.id)) return;

    send(
        msg.chat.id,
        `👥 TOTAL USERS : ${users.length}`
    );
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    let done = 0;

    for (let user of users) {

        try {

            await send(
                user,
                `📢 BROADCAST\n\n${match[1]}`
            );

            done++;

        } catch {}
    }

    send(
        msg.chat.id,
        `✅ SENT TO ${done} USERS`
    );
});

bot.onText(/\/ban (\d+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    const id = Number(match[1]);

    if (!bannedUsers.includes(id)) {

        bannedUsers.push(id);

        save(FILES.banned, bannedUsers);
    }

    send(
        msg.chat.id,
        `🚫 USER BANNED : ${id}

📖 GUIDE :
/unban ${id}`
    );
});

bot.onText(/\/unban (\d+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    const id = Number(match[1]);

    bannedUsers =
        bannedUsers.filter(x => x !== id);

    save(FILES.banned, bannedUsers);

    send(
        msg.chat.id,
        `✅ USER UNBANNED : ${id}`
    );
});

bot.onText(/\/premiumadd (\d+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    const id = Number(match[1]);

    if (!premiumUsers.includes(id)) {

        premiumUsers.push(id);

        save(FILES.premium, premiumUsers);
    }

    send(
        msg.chat.id,
        `⭐ PREMIUM ADDED : ${id}

📖 GUIDE :
/premiumremove ${id}`
    );
});

bot.onText(/\/premiumremove (\d+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    const id = Number(match[1]);

    premiumUsers =
        premiumUsers.filter(x => x !== id);

    save(FILES.premium, premiumUsers);

    send(
        msg.chat.id,
        `❌ PREMIUM REMOVED : ${id}`
    );
});

bot.onText(/\/addadmin (\d+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    const id = Number(match[1]);

    if (!config.admins.includes(id)) {

        config.admins.push(id);

        fs.writeFileSync(
            "./config.json",
            JSON.stringify(config, null, 2)
        );
    }

    send(
        msg.chat.id,
        `👑 NEW ADMIN : ${id}`
    );
});

bot.onText(/\/removeadmin (\d+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    const id = Number(match[1]);

    config.admins =
        config.admins.filter(x => x !== id);

    fs.writeFileSync(
        "./config.json",
        JSON.stringify(config, null, 2)
    );

    send(
        msg.chat.id,
        `❌ ADMIN REMOVED : ${id}`
    );
});

bot.onText(/\/addchannel (.+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    const ch = match[1];

    if (!config.force_channels.includes(ch)) {

        config.force_channels.push(ch);

        fs.writeFileSync(
            "./config.json",
            JSON.stringify(config, null, 2)
        );
    }

    send(
        msg.chat.id,
        `✅ CHANNEL ADDED : ${ch}`
    );
});

bot.onText(/\/removechannel (.+)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    const ch = match[1];

    config.force_channels =
        config.force_channels.filter(x => x !== ch);

    fs.writeFileSync(
        "./config.json",
        JSON.stringify(config, null, 2)
    );

    send(
        msg.chat.id,
        `❌ CHANNEL REMOVED : ${ch}`
    );
});

bot.onText(/\/maintenance (on|off)/, async (msg, match) => {

    if (!isAdmin(msg.from.id)) return;

    maintenanceMode =
        match[1] === "on";

    send(
        msg.chat.id,
        `🛠 MAINTENANCE ${maintenanceMode ? "ON" : "OFF"}`
    );
});

bot.onText(/\/server/, async (msg) => {

    if (!isAdmin(msg.from.id)) return;

    send(msg.chat.id,
box(`🖥 HOST : ${os.hostname()}

💾 RAM :
${(os.totalmem()/1024/1024/1024).toFixed(2)} GB

⚡ PLATFORM :
${os.platform()}

🚀 UPTIME :
${uptime()}`)
    );
});

bot.onText(/\/restart/, async (msg) => {

    if (!isAdmin(msg.from.id)) return;

    await send(
        msg.chat.id,
        "♻ RESTARTING..."
    );

    process.exit();
});

bot.onText(/\/backup/, async (msg) => {

    if (!isAdmin(msg.from.id)) return;

    await bot.sendDocument(
        msg.chat.id,
        "./config.json"
    );

    await bot.sendDocument(
        msg.chat.id,
        "./users.json"
    );

    await bot.sendDocument(
        msg.chat.id,
        "./premium.json"
    );

    await bot.sendDocument(
        msg.chat.id,
        "./banned.json"
    );
});

bot.onText(/\/export/, async (msg) => {

    if (!isAdmin(msg.from.id)) return;

    fs.writeFileSync(
        "./export.txt",
        users.join("\n")
    );

    await bot.sendDocument(
        msg.chat.id,
        "./export.txt"
    );
});

bot.onText(/\/topusers/, async (msg) => {

    if (!isAdmin(msg.from.id)) return;

    send(
        msg.chat.id,
        `🏆 TOP USERS\n\n${users.slice(0,10).join("\n")}`
    );
});

// ================= CALLBACK =================

bot.on("callback_query", async (q) => {

    if (q.data === "verify") {

        const joined =
            await checkJoin(q.from.id);

        if (!joined) {

            return bot.answerCallbackQuery(
                q.id,
                {
                    text: "❌ JOIN CHANNELS FIRST",
                    show_alert: true
                }
            );
        }

        bot.answerCallbackQuery(
            q.id,
            {
                text: "✅ VERIFIED"
            }
        );

        menu(
            q.message.chat.id,
            q.from.first_name
        );
    }

    if (q.data === "stats") {

        send(
            q.message.chat.id,
            `📊 USERS : ${users.length}`
        );
    }

    if (q.data === "info") {

        send(
            q.message.chat.id,
            `🤖 ${config.bot_name}`
        );
    }

    if (q.data === "premium") {

        send(
            q.message.chat.id,
            "⭐ TYPE /premium"
        );
    }
});

// ================= ERRORS =================

bot.on("polling_error", (e) => {
    console.log("Polling Error:", e.message);
});

process.on("uncaughtException", (e) => {
    console.log("Error:", e.message);
});

process.on("unhandledRejection", (e) => {
    console.log("Reject:", e);
});

// ================= ONLINE =================

console.log("✅ 𝐓𝐇𝐈𝐒 𝐁𝐎𝐓 𝐌𝐀𝐊𝐄 𝐔𝐒𝐄 𝐙𝐈𝐌𝐈 𝐁𝐇𝐀𝐈");
console.log(`👥 USERS : ${users.length}`);
console.log(`⭐ PREMIUM : ${premiumUsers.length}`);
console.log(`👑 ADMINS : ${config.admins.length}`);
