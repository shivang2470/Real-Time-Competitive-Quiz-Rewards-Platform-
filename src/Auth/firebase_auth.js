// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app")
const { firebaseApiKey, firebaseAppId, firebaseAuthDomain, firebaseMeasurementId, firebaseMessagingSenderId, firebaseProjectId, firebaseStorageBucket, databaseUrl } =  require("../../config/keys")
const {getDatabase, ref, set, remove, get, query} = require("firebase/database")

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
  measurementId: firebaseMeasurementId,
  databaseURL: databaseUrl,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const retryLimit = 100

const writeUserData = async (phone_number, value) => {
    return new Promise((async (resolve, reject) => {
        await set(ref(database, phone_number), value).then(async () => {
            resolve("data inserted successfully")
        }).catch(async (err)=> {
            reject(err)
        })
    }))
}

const readUserData = async (phone_number) => {
    let tries = 0
    let userRef = ref(database, `/users/${phone_number}`)
    return new Promise((async (resolve, reject) => {
        while(1){
            tries = tries + 1
            const usersSnapshot = await get(query(userRef)).catch(async err=>{
                reject(err)
            })
            if(usersSnapshot.val()){
                resolve(usersSnapshot.val()["isLoginRequest"])
                break;
            }
            else if(tries === retryLimit){
                resolve(usersSnapshot.val())
                break;
            }
            else{
                console.log(`Retried ${tries} times to feth user data from firebase`)
                continue;
            }
        }
    }))
}

const deleteUserData = async (phone_number) => {
    let userRef = ref(database, `/users/${phone_number}`)
    return new Promise((async (resolve, reject) => {
        const is_deleted = await remove(userRef).catch(async err=>{
            reject(err)
        })
        if(is_deleted){
            resolve(true)
        }
        else{
            resolve(false)
        }
    }))
}

const readWatchAdUserData = async (user_id) => {
    let tries = 0
    let userRef = ref(database, `/users/${user_id}`)
    return new Promise((async (resolve, reject) => {
        while(1){
            tries = tries + 1
            const usersSnapshot = await get(query(userRef)).catch(async err=>{
                reject(err)
            })
            if(usersSnapshot.val() || tries === retryLimit){
                resolve(usersSnapshot.val())
                break;
            }
            else{
                console.log(`Retried ${tries} times to feth watch ad data from firebase`)
                continue;
            }
        }
    }))
}

const deleteWatchAdUserData = async (user_id) => {
    let userRef = ref(database, `/users/${user_id}`)
    return new Promise((async (resolve, reject) => {
        const is_deleted = await remove(userRef).catch(async err=>{
            reject(err)
        })
        if(is_deleted){
            resolve(true)
        }
        else{
            resolve(false)
        }
    }))
}

module.exports = {writeUserData, readUserData, deleteUserData, readWatchAdUserData, deleteWatchAdUserData}
