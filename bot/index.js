var mqtt = require('mqtt');
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();

let timeout = 0;

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

var client  = mqtt.connect('mqtt://alarm', {
    username: 'mqtt-test',
    password: 'mqtt-test',
});

client.on('connect', function () {
    console.log('connect');
    client.subscribe(topics.bot.in, function (err) {
        if (!err) {
            client.publish(topics.bot.out, 'hello from bot');
            console.log('good');
        } else {
            console.log('error');
        }
    });

    client.subscribe(topics.bmp.out, function (err) {
        if (!err) {
            console.log('bmp topic subscription good');
        } else {
            console.log('bmp topic subscription error');
        }
    });

    client.subscribe(topics.temperature, function (err) {
        if (!err) {
            console.log('temperature topic subscription good');
        } else {
            console.log('temperature topic subscription error');
        }
    });

    client.subscribe(topics.relay0.out, function (err) {
        if (!err) {
            console.log('relay0 topic subscription good');
        } else {
            console.log('relay0 topic subscription error');
        }
    });

    client.subscribe(topics.relay1.out, function (err) {
        if (!err) {
            console.log('relay1 topic subscription good');
        } else {
            console.log('relay1 topic subscription error');
        }
    });

    client.subscribe(topics.water.out, function (err) {
        if (!err) {
            console.log('water topic subscription good');
        } else {
            console.log('water topic subscription error');
        }
    });
});

const log = [];
const air = [];

client.on('message', function (topic, message) {
    console.log(topic, message.toString());

    switch (topic.replace('/', '.')) {

    case (topics.temperature): {
        const t = parseFloat(message);
        air.push(t);
        if (air.length > 20) {
            const average = air.reduce((a, c) => (a + c / air.length), 0).toFixed(2);
            bot.telegram.sendMessage(
                '-400442557',
                `🌿 air - average ${average}°C`
            );
            air.length = 0;
        }
        break;
    }

    case (topics.bmp.out): {
        const t = parseFloat(message);
        log.push(t);

        if (t >= 35) {
            if (log.length > 1) {
                bot.telegram.sendMessage(
                    '-400442557',
                    `❄️ cooling...\n\ntemperatures:\n${log.join(', ')}`
                );
                log.length = 0;
            }
            // включаем реле (0 - включено)
            client.publish(topics.relay1.in, '0');
            timeout = 2;
        } else {
            if (timeout-- <= 0) {
                client.publish(topics.relay1.in, '1');
            }
        }
        break;
    }
    }
    // client.end();
});

process.once('SIGINT', () => {
    client.end();
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    client.end();
    bot.stop('SIGTERM');
});
