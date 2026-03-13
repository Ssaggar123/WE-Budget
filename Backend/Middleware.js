
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {

    const token = req.header("Authorization");

    if (!token) {
        return res.status(401).json({ message: "Access Denied" });
    }

    try {
        const verified = jwt.verify(token, "secretKey");
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: "Invalid Token" });
    }
};
const rateLimit = require("express-rate-limit");

module.exports = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts. Try later."
});
module.exports = (role) => (req, res, next) => {
    if (req.user.role !== role)
        return res.status(403).json({ message: "Access denied" });

    next();
};
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    const token = req.cookies.accessToken;
    if (!token) return res.sendStatus(401);

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch {
        res.sendStatus(403);
    }
};
router.get("/admin-data", auth, role("admin"), (req, res) => {
    res.json({ message: "Admin data" });
});