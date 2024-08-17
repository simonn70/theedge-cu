require("dotenv").config()
const jwt = require("jsonwebtoken")

const requireAuthUser = (req, res, next) => {
    const token = req.cookies.userjwt
    if (token) {
        jwt.verify(token, process.env.JWT_KEY, (err, decodedToken) => {
            if (err) {
                    res.redirect("./users/login")
            } else {
                next()
                }
            })
    } else {
        res.redirect("/users/login")
    }
}


module.exports = {
    requireAuthUser
}