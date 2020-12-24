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
        console.log(`subscribe ${channel}`);
        console.log(`${!err ? 'good' : 'error' }`);
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
        const status = !(parseInt(message));
        if (status != isOn) {
            isOn = status;
            bot.telegram.sendMessage(
                '-400442557',
                isOn ? '🌝' : '🌚'
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
});
process.once('SIGTERM', () => {
    client.end();
    bot.stop('SIGTERM');
});

bot.launch();
