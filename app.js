import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { normal, errorr } from './middlewares/error.js';
// Load environment variables FIRST
dotenv.config();

import connectDB from './config/database.js';
import passport from './config/passport.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Connect to database
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create separate session configurations for admin and user
const createSessionConfig = (sessionName, cookieName) => {
  return session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,  // Changed to true to save guest sessions
    rolling: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      touchAfter: 24 * 3600,
      ttl: 7 * 24 * 60 * 60
    }),
    cookie: {
      secure: true,  // Set false for HTTP, true only with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: 'lax'
    },
    name: cookieName
  });
};

// Apply different session middleware based on route
app.use('/admin', createSessionConfig('admin-session', 'horologue.admin.sid'));
app.use('/', createSessionConfig('user-session', 'horologue.user.sid'));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Use routes
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

// // 404 handler - manual middleware
// app.use((req, res, next) => {
//   res.status(404).render('error/404', {
//     url: req.originalUrl,
//     method: req.method
//   });
// });

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(500).render('error/404', {
//     url: req.originalUrl,
//     method: req.method
//   });
// });

app.use(normal)
app.use(errorr)


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;