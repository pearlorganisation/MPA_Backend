import dotenv from "dotenv";
dotenv.config();
console.log("CALLBACK URL:", process.env.GOOGLE_CALLBACK_URL);
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
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
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
