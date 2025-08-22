import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MemoryStore from "memorystore";
import { storage } from "./storage";

// Default admin user for local development
const DEFAULT_ADMIN = {
  id: "1",
  email: "admin@importflow.local",
  password: "admin123", // In production, this should be hashed
  firstName: "Admin",
  lastName: "User",
  role: "admin" as const,
  profileImageUrl: ""
};

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemoryStoreSession = MemoryStore(session);
  const sessionStore = new MemoryStoreSession({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
  
  return session({
    secret: process.env.SESSION_SECRET || 'local-development-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupLocalAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Initialize default admin user
  try {
    await storage.upsertUser(DEFAULT_ADMIN);
    console.log("✓ Default admin user initialized (admin@importflow.local / admin123)");
  } catch (error) {
    console.log("Admin user already exists or error creating:", error);
  }

  // Local Strategy for username/password authentication
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email: string, password: string, done) => {
      try {
        // Check default admin user first
        if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
          const user = { ...DEFAULT_ADMIN };
          delete (user as any).password; // Remove password from user object
          return done(null, user);
        }
        
        // Check database users
        try {
          const dbUser = await storage.getUserByEmail(email);
          if (dbUser && dbUser.password === password) {
            const user = { ...dbUser };
            delete (user as any).password; // Remove password from user object
            return done(null, user);
          }
        } catch (dbError) {
          console.log("Database user check failed:", dbError);
        }
        
        return done(null, false, { message: 'Invalid credentials' });
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      // Check default admin user first
      if (id === DEFAULT_ADMIN.id) {
        const user = { ...DEFAULT_ADMIN };
        delete (user as any).password;
        return done(null, user);
      }
      
      // Check database users
      try {
        const dbUser = await storage.getUser(id);
        if (dbUser) {
          const user = { ...dbUser };
          delete (user as any).password;
          return done(null, user);
        }
      } catch (dbError) {
        console.log("Database user deserialize failed:", dbError);
      }
      
      done(null, false);
    } catch (error) {
      done(error);
    }
  });

  // Login route
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Session error' });
        }
        return res.json({ user, message: 'Login successful' });
      });
    })(req, res, next);
  });

  // Logout route
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout error' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

  // Get current user route
  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Registration route
  app.post('/api/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Check if user already exists
      try {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: 'User already exists' });
        }
      } catch (error) {
        // User doesn't exist, continue with registration
      }

      // Create new user
      const newUser = {
        id: Date.now().toString(), // Simple ID generation for demo
        email,
        password, // In production, hash this password
        firstName,
        lastName,
        role: role || 'admin', // Default role
        profileImageUrl: ''
      };

      await storage.upsertUser(newUser);
      
      // Remove password from response
      const userResponse = { ...newUser };
      delete (userResponse as any).password;
      
      res.status(201).json({ 
        user: userResponse, 
        message: 'User registered successfully' 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};