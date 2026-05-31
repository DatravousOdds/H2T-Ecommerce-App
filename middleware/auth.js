const { getAdmin } = require("../firebase");
const admin = getAdmin();

const verifyAuth =  async (req, res, next) => {
    const token = req.headers.authorization.split(" ")[1];

    if (!token) return res.status(401).json({
        success: false,
        message: "Not authorize"
    })

    try {
        const verifyToken = admin.auth().verifyIdToken(token);
        req.token = verifyToken.uid;
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