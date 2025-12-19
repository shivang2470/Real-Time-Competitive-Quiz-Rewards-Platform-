const express = require('express');
const router = express.Router();
const auth = require('../../Auth/api_key_auth')
const {getSettings} = require('../../models/index')
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const {redis} = require('../../models/redis');
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.get('/', limiter, check_domain_middleware, auth, async (req, res) => {
    const cache_key = `${req.originalUrl}`
    const cache_data = await redis.get( cache_key );
    if ( cache_data == undefined ){
        const data = await getSettings()
        if(data){
            await redis.set( cache_key, JSON.stringify({data: data}), {EX: 86400} );
            return res.status(200).json({data: data})
        }
    }
    else{
        return res.status(200).json(JSON.parse(cache_data))
    }
})

module.exports = router;
