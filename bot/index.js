var mqtt = require('mqtt');
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

const defaultTopics = (topic) => ({
    in: `${topic}.in`,
    out: `${topic}.out`,
});

const topics = {
    relay8: defaultTopics('relay8'),
};

const client  = mqtt.connect('mqtt://alarm', {
    username: 'mqtt-test',
    password: 'mqtt-test',
});

bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => ctx.reply('Hey there'));

const WATER_TIMEOUT = 10000;

let lastWaterTimeout;

bot.command('water', (ctx) => {
    clearTimeout(lastWaterTimeout);
    client.publish(topics.relay8.in, '1000');
    lastWaterTimeout = setTimeout(() => {
        client.publish(topics.relay8.in, '0000');
    }, WATER_TIMEOUT);
});

function subscribe(channel) {
    client.subscribe(channel, function (err) {
        console.log(`subscribe ${channel} - ${!err ? 'good' : 'error' }`);
    });
}

client.on('connect', function () {
    console.log('connect');
    subscribe(topics.relay8.out);
});

const status = {
    isOn: false,
    isWater: false,
    isCooling: false,
    red: [],
    green: [],
    blue: [],
    yellow: [],
    state: '',
};

const colors = ['red', 'green', 'blue', 'yellow'];

client.on('message', function (topic, message) {

    switch (topic.replace('/', '.')) {

    case (topics.relay8.out): {
        const relay8 = JSON.parse(message.toString());
        status.state = relay8.state;

        for (let color of colors) {
            status[color].push(relay8[color]);
        }

        const average = {};

        if (status.red.length > 300) {
            for (let color of colors) {
                status[color].length = 0;
            }
        }

        if (relay8.state[0] == '1') {
            if (!status.isWater) {
                bot.telegram.sendMessage(
                    '-400442557',
                    `💧 watering start`,
                );
            }
            status.isWater = true;
        }

        if (relay8.state[0] == '0') {
            if (status.isWater) {
                bot.telegram.sendMessage(
                    '-400442557',
                    `💧 watering end`,
                );
            }
            status.isWater = false;
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
    const average = {};

    for (let color of colors) {
        const colorAverage = status[color].reduce(
            (a, c) => (a + c / status[color].length), 0
        ).toFixed(2);

        average[color] = colorAverage;
        status[color].length = 0;
    }

    const temps = Object.entries(average).reduce(
        (a, c) => (a + c.join(' - ') + '°C\n'), ''
    );

    ctx.reply(`
state: ${status.state}
temps: \n${temps}`);

});

bot.launch();
