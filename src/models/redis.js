const {createClient} =  require('redis');

const redis = createClient({
    password: process.env.PASSWORD,
    socket: {
        host: process.env.HOST,
        port: process.env.REDIS_PORT
    }
})

redis.on('error', (err) => console.log('Redis Client Error', err));
redis.on('connect', () => console.log('Connected to Redis'));

redis.connect();

redis.FLUSHALL();

async function deleteKeysByPrefix(prefix) {
    const stream = redis.scanIterator({
        TYPE: 'string', // Use this if you want to filter by type, remove if not needed
        MATCH: prefix + '*', // Replace with your prefix
        COUNT: 100
    });

    let keysDeleted = 0;
    for await (const key of stream) {
        await redis.del(key);
        console.log(`Deleted redis key ${key}`);
        keysDeleted++;
    }
}

async function fetchKeysWithPrefix(prefix) {
    const stream = redis.scanIterator({
        TYPE: 'string', // Use this if you want to filter by type, remove if not needed
        MATCH: prefix + '*', // Replace with your prefix
        COUNT: 1000000
    });
    let data  = [];
    for await (const key of stream) {
        data.push(JSON.parse(await redis.get(key)));
    }

    return data;
}

module.exports = {
    redis,
    deleteKeysByPrefix,
    fetchKeysWithPrefix
};
