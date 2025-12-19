const response = async (data, status_code, message, ad={show_ad: false}, checkpoint=null) => {
    if (Array.isArray(data) || Object.keys(data).length > 0) {
        return {
            data,
            ad,
            checkpoint,
            message
        }
    } else {
        return {
            ad,
            checkpoint,
            message: message
        }
    }
}

const responseError = async () => {
    return {
        message: "Some Error Occurred! Please try after sometime"
    }
}

module.exports = { response, responseError }
