var mqtt = require('mqtt');
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

const defaultTopics = (topic) => ({
    in: `${topic}.in`,
    out: `${topic}.out`,
});

const topics = {
    bot: defaultTopics('bot'),
    bmp: defaultTopics('bmp180'),
    relay1: defaultTopics('relay1'),
    water: defaultTopics('water'),
    temperature: 'water.temperature',
};

const client  = mqtt.connect('mqtt://alarm', {
    username: 'mqtt-test',
    password: 'mqtt-test',
});

bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));

bot.command('lights_on', (ctx) => {
    client.publish(topics.relay1.in, '0');
});

bot.command('lights_off', (ctx) => {
    client.publish(topics.relay1.in, '1');
});

bot.command('water_off', (ctx) => {
    client.publish(topics.water.in, '00');
});

bot.command('water_5sec1', (ctx) => {
    client.publish(topics.water.in, '01');
    setInterval(() => {
        client.publish(topics.water.in, '00');
    }, 5000);
});

bot.command('water_5sec2', (ctx) => {
    client.publish(topics.water.in, '10');
    setInterval(() => {
        client.publish(topics.water.in, '00');
    }, 5000);
});

function subscribe(channel) {
    client.subscribe(channel, function (err) {
        console.log(`subscribe ${channel} - ${!err ? 'good' : 'error' }`);
    });
}

client.on('connect', function () {
    console.log('connect');
    subscribe(topics.bot.in);
    subscribe(topics.bmp.out);
    subscribe(topics.relay1.out);
    subscribe(topics.water.out);
    subscribe(topics.temperature);
});

let isOn = false;
const isOnSmile = () => (isOn ? '🌝' : '🌚');
const air = [];
const bmp = [];
// количество сообщений, по которым считается статистика
// (часть теряется, за каждое потерянное - +2с)
const airJoinLength = () => (isOn ? 150 : 300);
const bmpJoinLength = () => (isOn ? 150 : 300);

client.on('message', function (topic, message) {

    switch (topic.replace('/', '.')) {

    case (topics.temperature): {
        const t = parseFloat(message);
        air.push(t);
        if (air.length > airJoinLength()) {
            const average = air.reduce((a, c) => (a + c / air.length), 0).toFixed(2);
            bot.telegram.sendMessage(
                '-400442557',
                `${isOnSmile()} 🌿 air : ${average}°C`
            );
            air.length = 0;
        }
        break;
    }

    case (topics.bmp.out): {
        const t = parseFloat(message);
        bmp.push(t);
        if (bmp.length > bmpJoinLength()) {
            const firstLast = Array.from(
                new Set([
                    bmp[0],
                    bmp[bmp.length - 1],
                ])
            ).map(a => `${a}°C`).join(' - ');
            bot.telegram.sendMessage(
                '-400442557',
                `${isOnSmile()} 🌡 light : ${firstLast}`
            );
            bmp.length = 0;
        }

        if (t >= 41) {
            bot.telegram.sendMessage(
                '-373287526',
                `HIGH TEMPERATURE!!! ${t}`
            );
        }
        break;
    }

    case (topics.relay1.out): {
        // 0 - реле включено
        const status = !(parseInt(message));
        if (status != isOn) {
            isOn = status;
            bot.telegram.sendMessage(
                '-400442557',
                isOnSmile()
            );
        }
        break;
    }

    case (topics.water.out): {
        if (message[0] == '1') {
            bot.telegram.sendMessage(
                '-400442557',
                `💧 watering 1`,
            );
        }
        if (message[1] == '1') {
            bot.telegram.sendMessage(
                '-400442557',
                `💧 watering 2`,
            );
        }
        break;
    }

    default: {
        console.log(`unmatched message topic: ${topic} (message: ${message})`);
    }}
});

process.once('SIGINT', () => {
    client.end();
    bot.stop('SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    client.end();
    bot.stop('SIGTERM');
    process.exit(0);
});

bot.command('ping', (ctx) => {
    const firstLast = Array.from(
        new Set([
            bmp[0],
            bmp[bmp.length - 1],
        ])
    ).map(a => `${a}°C`).join(' - ');
    const average = air.reduce((a, c) => (a + c / air.length), 0).toFixed(2);

    ctx.reply(`
/ping
${isOnSmile()} 🌡 light : ${firstLast}
${isOnSmile()} 🌿 air : ${average}°C
`);
});

bot.launch();
