// config/passport.js
// Fixes:
//   - No try/catch in the strategy callback — any DB error would crash
//     silently or produce an unhandled rejection; done(err) was never called
//   - GOOGLE_CLIENT env var name is ambiguous — standardised to GOOGLE_CLIENT_ID
//     (update your .env accordingly)
//   - No error passed to done() on failure path

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(new GoogleStrategy(
    {
        clientID:     process.env.GOOGLE_CLIENT_ID,     // Fix: was GOOGLE_CLIENT (non-standard name)
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL:  "/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ email: profile.emails[0].value });

            if (!user) {
                user = await User.create({
                    name:       profile.displayName,
                    email:      profile.emails[0].value,
                    isVerified: true
                });
            }

            return done(null, user);
        } catch (err) {
            return done(err, null); // ✅ Propagate DB errors properly
        }
    }
));

module.exports = passport;