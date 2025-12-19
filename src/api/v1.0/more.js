const express = require('express');
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { response, responseError } = require('../../models/response');
const { getSettings } = require('../../models');
const { insertActivity } = require('../../models/activities');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const {redis} = require('../../models/redis');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

// Links

router.get('/links', limiter, check_domain_middleware, async (req, res) => {
    const cache_key = `${req.originalUrl}`
    const cache_data = await redis.get( cache_key );
    if ( cache_data == undefined ){
        const data = await getSettings().catch(async err => {
            await insertActivity(
                "Unknown",
                "Unknown",
                "More",
                "Error occured in getSettings function",
                req.url,
                err)
            return res.status(500).json(await responseError());
        })
        if(data){
            const links = {
                    "privacy_policy": data.privacy_policy_link,
                    "terms_conditions": data.terms_and_conditions_link,
                    "about_us": data.about_us_link,
                    "contact_us": data.contact_us_link,
                    "facebook": data.facebook_link,
                    "instagram": data.instagram_link,
                    "linkedin": data.linkedin_link,
                    "app_walkthrough_video": data.app_walkthrough_video_link,
                    "game_app_walkthrough_video_link": data.game_app_walkthrough_video_link,
                    "talentitan_app_link": "https://play.google.com/store/apps/details?id=com.talen_titan&pli=1",
                    "talentitan_games_app_link": "https://play.google.com/store/apps/details?id=com.talentitan.talentitan_games&hl=en",
                    "talentitan_register_guide": "https://youtu.be/pdALs3JhcLs",
                    "talentitan_home_page_guide": "https://youtu.be/KypGghaFf0A",
                    "talentitan_quiz_section_guide": "https://youtu.be/dAwvMFmkWLg",
                    "talentitan_battle_section_guide": "https://youtu.be/vl-HlwM84po",
                    "talentitan_withdraw_section_guide": "https://youtu.be/enotvnS_H0g"
                }
            const data_to_send = await response(links, 200, "Links data retrieved successfully")
            await redis.set( cache_key, JSON.stringify(data_to_send), {EX: 86400} );
            return res.status(200).json(data_to_send);
        }
    }
    else{
        return res.status(200).json(JSON.parse(cache_data))
    }
})

module.exports = router;
