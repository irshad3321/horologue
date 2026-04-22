import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Only configure Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this Google ID
            let user = await User.findOne({ googleId: profile.id });
            
            if (user) {
                // Check if user is blocked
                if (user.isBlocked) {
                    return done(null, false, { message: 'Your account has been blocked' });
                }
                // User exists and not blocked, return user
                return done(null, user);
            }
            
            // Check if user exists with same email
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
                // Check if existing user is blocked
                if (user.isBlocked) {
                    return done(null, false, { message: 'Your account has been blocked' });
                }
                
                // Link Google account to existing user
                user.googleId = profile.id;
                user.isVerified = true; // Google accounts are pre-verified
                await user.save();
                return done(null, user);
            }
            
            // Create new user
            const newUser = new User({
                googleId: profile.id,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
                isVerified: true, // Google accounts are pre-verified
                isBlocked: false,
                isAdmin: false
            });
            
            await newUser.save();
            return done(null, newUser);
            
        } catch (error) {
            console.error('Google OAuth error:', error);
            return done(error, null);
        }
    }));
} else {
    console.warn('Google OAuth credentials not found. Google authentication will be disabled.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;