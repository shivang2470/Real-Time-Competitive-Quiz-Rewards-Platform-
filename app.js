const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const bodyParser = require("body-parser");
// const models = require("./src/db/index");
// const connect = require("./src/db/index");
const dns = require('dns');

const indexRouter = require("./src/index");
const {
  referralLeaderboardCron,
  referralLeaderboardResultCron,
  quizLeaderboardCron,
  quizLeaderboardResultCron,
  scheduleQuizLeaderboardEvents,
  deleteVoteOldData,
  deleteAirtimeOperatorFile,
  reQueryCron,
  quizLeaderboardCronBeforeResult,
  insertAirtimeOperatorFile,
  quizLeaderboardCronAfterEventStart,
  createBattleScheduler,
  scheduleLiveBattlesWithoutBots,
  declareResultOfOldBattlesWithoutBots,
  scheduleLiveBattlesWithoutBotsIn10Min,
  startHealthCheckScheduler,
} = require("./src/cron");

// v1
const register1_0Router = require("./src/Auth/v1/register");
const login1_0Router = require("./src/Auth/v1/login");
const logout1_0Router = require("./src/Auth/v1/logout");
const version1_0Index = require("./src/api/v1.0/index");
const version1_0Home = require("./src/api/v1.0/home");
const version1_0MyGames = require("./src/api/v1.0/my_games");
const version1_0StartBattle = require("./src/api/v1.0/start_battle");
const version1_0Vote = require("./src/api/v1.0/user_vote");
const version1_0UserDetails = require("./src/api/v1.0/user_details");
const version1_0Coins = require("./src/api/v1.0/coins");
const version1_0More = require("./src/api/v1.0/more");
const version1_0SlackNotification = require("./src/api/v1.0/slack_notifications");
const version1_0Referral = require("./src/api/v1.0/referral");
const version1_0WatchAd = require("./src/api/v1.0/watch_ads");
const version1_0UserOTP = require("./src/Auth/user_otp");
const version1_0Redemption = require("./src/api/v1.0/redemption");
const version1_0Setting = require("./src/api/v1.0/settings");
const version1_0InAppNotification = require("./src/api/v1.0/in_app_notification");
const version1_1Home = require("./src/api/v1.1/home");
const version1_1GuestUserLogin = require("./src/Auth/v1.1/guest_user_login");
const version1UserVerify = require("./src/Auth/v1/user_verify");
const version1GameHome = require("./src/api/v1.0/game_home");
const version1Checkpoint = require("./src/api/v1.0/checkpoint");

//v2
const version2_0Quiz = require("./src/api/v2.0/quiz");
const version2_0ReferralLeaderboard = require("./src/api/v2.0/referral_leaderboard");

const version2_0Home = require("./src/api/v2.0/home");
const delete_user_route = require("./src/Auth/delete_user");
const recover_user_route = require("./src/Auth/recover_user");
const apk_game_route = require('./src/api/v2.0/games/index')
const apk_game_watch_ad_route = require('./src/api/v2.0/games/watch_ads')
const live_events_route = require("./src/api/v2.0/liveEvents")
const quiz_leaderboard_route = require("./src/api/v2.0/quiz_leaderboard")
const redemption_v2_route = require("./src/api/v2.0/redemption")

// v3
const version3_0Home = require("./src/api/v3.0/home");
const version3_0Events = require("./src/api/v3.0/events");

// ssl verify
const ssl_verify = require("./src/api/ssl_verify");
const { battlesSyncCron } = require("./src/cron/battlesSyncCron");

//scripts
const { saveAuthorizationToken } = require("./src/models/reloadly");
const constants = require("./config/constants");

// Perform DNS lookup to resolve the domain to IP addresses
dns.lookup('api.talentitan.com', { all: true }, (err, addresses) => {
  if (err) {
    console.error('DNS lookup failed:', err);
    return;
  }

  // Extract IP addresses from the lookup results
  const proxyIps = addresses.map(addr => addr.address);
  // Set trust proxy with the resolved IP addresses
  app.set('trust proxy', proxyIps);
});

// (async () => {
//   try {
//       // Your asynchronous code here
//       const result = await connect();
//       console.error('MongoDB:', result);
//   } catch (error) {
//       console.error('Error while conecting MongoDB:', error);
//   }
// })();

// app.use((req, res, next) => {
//   req.models = models;
//   next();
// });
if (constants.SHOW_LOGS) {
  app.use(logger("dev"));
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Request-Headers", "https");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-api-key"
  );
  next();
});
app.use(cookieParser());
app.use("/", indexRouter);

//v1
app.use("/api/v1.0", register1_0Router);
app.use("/api/v1.0", login1_0Router);
app.use("/api/v1.0", logout1_0Router);
app.use("/api/v1.0", version1_0Index);
app.use("/api/v1.0", version1_0Home);
app.use("/api/v1.0", version1_0MyGames);
app.use("/api/v1.0", version1_0StartBattle);
app.use("/api/v1.0", version1_0Vote);
app.use("/api/v1.0", version1_0UserDetails);
app.use("/api/v1.0", version1_0Coins);
app.use("/api/v1.0", version1_0More);
app.use("/api/v1.0", version1_0SlackNotification);
app.use("/api/v1.0", version1_0UserOTP);
app.use("/api/v1.0/referral", version1_0Referral);
app.use("/api/v1.0/watch_ad", version1_0WatchAd);
app.use("/api/v1.0/redemption", version1_0Redemption);
app.use("/api/v1.0/watch_ad", version1_0WatchAd);
app.use("/api/v1.0/settings", version1_0Setting);
app.use("/api/v1.0", version1_0InAppNotification);
app.use("/api/v1.1", version1_1Home);
app.use("/api/v1.1", version1_1GuestUserLogin);
app.use("/api/v1.0", version1UserVerify);
app.use("/api/v1.0/games", version1GameHome);
app.use("/api/v1.0/checkpoint", version1Checkpoint);

//v2
app.use("/api/v2.0/quiz", version2_0Quiz);
app.use("/api/v2.0/referral_leaderboard", version2_0ReferralLeaderboard);
app.use("/api/v2.0/", version2_0Home);
app.use("/api/v2.0/delete_user", delete_user_route);
app.use("/api/v2.0/recover_user", recover_user_route);
app.use("/api/v2.0/game", apk_game_route)
app.use("/api/v2.0/game/watch_ad", apk_game_watch_ad_route)
app.use("/api/v2.0/live_events", live_events_route)
app.use("/api/v2.0/quiz_leaderboard", quiz_leaderboard_route);
app.use("/api/v2.0/redemption", redemption_v2_route);

// v3
app.use("/api/v3.0/", version3_0Home);
app.use("/api/v3.0/", version3_0Events);

//ssl
app.use("/", ssl_verify);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Crons

async function runScripts() {
  if (process.env.ENVIRONMENT === "cron-server") {
    await saveAuthorizationToken("giftcard");
    await saveAuthorizationToken("airtime");
  }
}


async function runCrons() {
  if (process.env.ENVIRONMENT === "cron-server") {
    const version2_0Index = require("./src/api/v2.0/index");
    app.use("/api/v2.0/", version2_0Index);
    await battlesSyncCron();
    await referralLeaderboardCron();
    await referralLeaderboardResultCron();
    await quizLeaderboardCron();
    await quizLeaderboardResultCron();
    await scheduleQuizLeaderboardEvents();
    await quizLeaderboardCronBeforeResult();
    await quizLeaderboardCronAfterEventStart();
    await deleteVoteOldData();
    await createBattleScheduler();
    await scheduleLiveBattlesWithoutBots();
    await declareResultOfOldBattlesWithoutBots();
    await scheduleLiveBattlesWithoutBotsIn10Min();
    // await reQueryCron();
    await deleteAirtimeOperatorFile();
    await insertAirtimeOperatorFile();
    await startHealthCheckScheduler();
  }
}

runCrons();
runScripts();

module.exports = app;
