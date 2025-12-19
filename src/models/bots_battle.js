const AWS = require('aws-sdk');
const key = require('../../config/keys');
const { save_battle } = require('../start_battle/save_battle');
const WebSocket = require('ws');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

async function getRandomBot() {
    const params = {
      TableName: tableUser,
      FilterExpression: '#type = :typeVal',
      ExpressionAttributeNames: {
        '#type': 'user_type'
      },
      ExpressionAttributeValues: {
        ':typeVal': 'bot'
      }
    };
  
    try {
      // First, scan to get the count of all 'bot' type entries
      const scanResults = await docClient.scan(params).promise();
      const bots = scanResults.Items;
      const count = bots.length;
  
      if (count === 0) {
        return null;
      }
  
      // Select a random bot
      const randomIndex = Math.floor(Math.random() * count);
      const randomBot = bots[randomIndex];
  
      return randomBot;
    } catch (error) {
      console.error('Error fetching random bot:', error);
      return null;
    }
  }
  
  const createBotBattles = async () => {
    let bot1 = await getRandomBot()
    let bot2 = await getRandomBot()
    while(1){
      if(bot1.id == bot2.id){
        bot2 = await getRandomBot()
      } else {
        break;
      }
    }
    const player1 = {
      user_id: bot1.id,
      battle_id: key.dp_battle_id,
      battle_file: bot1.avatar
    }
    const player2 = {
      user_id: bot2.id,
      battle_id: key.dp_battle_id,
      battle_file: bot2.avatar
    }
    const matched_items = [player1, player2]
    await save_battle(matched_items);
    console.log("Bots battle created successfully!")
  }

  const createConnectionForBot = async (message) => {
    const socket = new WebSocket('wss://vzjb403l0k.execute-api.ap-south-1.amazonaws.com/production/');
    socket.onopen = async () => {
      console.log('Client WebSocket connection established...');
      socket.send(JSON.stringify(message));
      console.log('Message sent:', message);
      socket.on('message', (data) => {
        console.log('Message received from server:', data);
      });
      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      socket.on('close', (event) => {
        console.log('WebSocket connection closed:', event);
      });
    };
  }

module.exports = {createBotBattles, getRandomBot, createConnectionForBot};