const registerValidation = async (request) =>{
    const name = request.name.replace(/^\s+|\s+$/gm,'')
    const phone_number = request.phone_number.toString().replace(/^\s+|\s+$/gm,'')
    const username = request.username.replace(/^\s+|\s+$/gm,'')
    const password = request.password.replace(/^\s+|\s+$/gm,'')
    return new Promise((async (resolve, reject) => {
        const specialChars = /[`!@#$%^&*()+\-=\[\]{};':"\\|,<>\/?~]/;
        const passwordSpecialChars = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/
        if (name && phone_number &&
            username && password) {
            if (!/^\d+$/.test(phone_number)) {
                reject("Phone number can only contain number")
            }
            else if(name.length >= 80 || name.length <= 2){
                reject("The name should be more than 2 character and less than 80 character")
            }
            else if(phone_number.length > 10 || phone_number.length < 10){
                reject("The phone number should be 10 digit (India only)")
            }
            else if(username.length >= 27 || username.length <= 3){
                reject("The username should be more than 3 character and less than 27 character ")
            }
            else if(password.length < 6){
                reject("The password should be greater than 6 character")
            }
            else if(specialChars.test(username)){
                reject("The username should not contain special character except underscore(_ & .)")
            }
            else if(/\s/g.test(username)){
                reject("The username should not contain space")
            }
            else if(/\s/g.test(password)){
                reject("The password should not contain space")
            }
            else{
                resolve("Success")
            }
        }
        else{
            if(!name){
                reject("Please enter your name")
            }
            else if(!phone_number){
                reject("Please enter your phone number")
            }
            else if(!username){
                reject("Please enter your username")
            }
            else if(!password){
                reject("Please enter your password")
            }
        }
    }))
}

const loginValidation = async (request) => {
    const phone_number = request.phone_number.toString()
    return new Promise((async (resolve, reject) => {
        if (phone_number && request.password) {
            if (!/^\d+$/.test(phone_number)) {
                reject("Phone number can only contain number")
            }
            else if(phone_number.length > 10 || phone_number.length < 10){
                reject("The phone number should be 10 digit")
            }
            else{
                resolve("Success")
            }
        }
        else{
            if (!phone_number){
                reject("Please enter your phone number")
            }
            else if(!request.password){
                reject("Please enter your password")
            }
        }
    }))
}

module.exports = { loginValidation, registerValidation }