const express = require('express');
const router = express.Router();

router.get('/.well-known/acme-challenge/m0XV2R4nC5kkD3BJwtEA1YpxKDAvgfezuVoHOOUnX2c', async (req, res) => {
    return res.status(200).send("m0XV2R4nC5kkD3BJwtEA1YpxKDAvgfezuVoHOOUnX2c._gC1ieCklwNTZObM2L00mVeWhZESggwkM91zCC0i0xo")
})

module.exports = router;
