const NodeCache = require( "node-cache" );

const HomeCache = new NodeCache( { stdTTL: 0, checkperiod: 0 } );

const commonCache = new NodeCache( { stdTTL: 0, checkperiod: 0 } );

const inAppNotification = new NodeCache( { stdTTL: 0, checkperiod: 0 } );

const referral = new NodeCache( { stdTTL: 0, checkperiod: 0 } );

const reloadly = new NodeCache( { stdTTL: 0, checkperiod: 0 } );

module.exports = {
    HomeCache,
    commonCache,
    inAppNotification,
    referral,
    reloadly
}