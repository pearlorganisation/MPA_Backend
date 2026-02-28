import dotenv from "dotenv";
dotenv.config();   // 👈 ADD THIS HERE

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

if (!process.env.GOOGLE_CLIENT_ID) {
  console.log("❌ GOOGLE_CLIENT_ID is missing");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    //   callbackURL: "/api/v1/users/google/callback",
    callbackURL:
  process.env.NODE_ENV === "production"
    ? "https://mpa-backend-og9r.onrender.com/api/v1/users/google/callback"
    : "http://localhost:4040/api/v1/users/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const user = {
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
      };

      return done(null, user);
    }
  )
);

export default passport;