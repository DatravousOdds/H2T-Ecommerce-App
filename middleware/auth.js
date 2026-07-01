const { getAdmin } = require("../firebase.js");
const admin = getAdmin();

const verifyAuth =  async (req, res, next) => {
    const authHeaders = req.headers.authorization;
    
    if (!authHeaders) return res.status(401).json({
        success: false,
        message: 'Missing headers'
    })

    const token = authHeaders.split(" ")[1];

    if (!token) return res.status(401).json({
        success: false,
        message: "Not authorize"
    })

    try {
        const verifyToken = await admin.auth().verifyIdToken(token);
        req.token = verifyToken;
        next()
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid token!"
        })
    }

};

module.exports = {
    verifyAuth
};