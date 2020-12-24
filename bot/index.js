var mqtt = require('mqtt');
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();

const defaultTopics = (topic) => ({
    in: `${topic}.in`,
    out: `${topic}.out`,
});

const topics = {
    bot: defaultTopics('bot'),
    bmp: defaultTopics('bmp180'),
    relay0: defaultTopics('relay0'),
    relay1: defaultTopics('relay1'),
    water: defaultTopics('water'),
    temperature: 'water.temperature',
};

const client  = mqtt.connect('mqtt://alarm', {
    username: 'mqtt-test',
    password: 'mqtt-test',
});

function subscribe(channel) {
    client.subscribe(channel, function (err) {
        console.log(`subscribe ${channel}`);
        console.log(`${!err ? 'good' : 'error' }`);
    });
}

client.on('connect', function () {
    console.log('connect');
    subscribe(topics.bot.in);
    subscribe(topics.bmp.out);
    subscribe(topics.relay1.out);
    subscribe(topics.temperature);
});

const log = [];
const air = [];

client.on('message', function (topic, message) {

    switch (topic.replace('/', '.')) {

    case (topics.temperature): {
        const t = parseFloat(message);
        air.push(t);
        if (air.length > 20) {
            const average = air.reduce((a, c) => (a + c / air.length), 0).toFixed(2);
            bot.telegram.sendMessage(
                '-400442557',
                `🌿 air : ${average}°C`
            );
            air.length = 0;
        }
        break;
    }

    case (topics.bmp.out): {
        const t = parseFloat(message);
        log.push(t);
        if (log.length > 20) {
            const unique = Array.from(new Set(log)).map(a => `${a}°C`).join(', ');
            bot.telegram.sendMessage(
                '-400442557',
                `🌡 light : ${unique}`);
            log.length = 0;
        }

        if (t >= 40) {
            bot.telegram.sendMessage(
                '-373287526',
                `HIGH TEMPERATURE!!! ${t}`
            );
        }
        break;
    }

    case (topics.relay1.out): {
        // 0 - релю включено
        const isOn = !(parseInt(message));
        if (isOn) {
            // console.log('is on');
        }
        break;
    }

    default: {
        console.log('unmatched message topic: ', topic);
    }}
});

process.once('SIGINT', () => {
    client.end();
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    client.end();
    bot.stop('SIGTERM');
});
