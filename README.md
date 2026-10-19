
# 🌿 AFTERGLOW GARDEN
### Small Steps, Beautiful Growth.

AFTERGLOW GARDEN is a full-stack web application that combines
habit tracking, gamification, and a virtual garden.

Users can create daily habits, track their progress, earn
experience points (XP) and coins, complete quests, grow virtual
plants, and decorate their personal garden.

The application is designed with a Minimal Garden theme,
featuring soft green, cream, and nature-inspired elements.

## 🎯 Project Objectives

1. To develop a web application for managing daily habits.
2. To encourage consistent habit completion through rewards.
3. To visualize personal growth using a virtual garden.
4. To implement user authentication and personalized data.
5. To integrate frontend, backend, and MongoDB in one system.

## ✨ Features

### 1. User Authentication
- User registration
- Login and logout
- Password hashing using bcryptjs
- Session-based authentication
- User-specific data access

### 2. Habit Tracker
- Create a new habit
- View personal habits
- Edit habit details
- Activate or pause habits
- Track daily completion status

### 3. XP, Coins & Level
- Earn 20 XP for completing a daily habit
- Earn 10 Coins for completing a daily habit
- Prevent duplicate daily habit completion
- Level increases every 100 XP

### 4. Virtual Garden
- Plant a virtual plant for an active habit
- Choose from three plant types
- Display plant growth based on habit completion history
- View progress through four growth stages:
  Seed, Seedling, Growing, and Mature

### 5. Quests & Achievements
- Daily quests
- One-time achievements
- Quest progress tracking
- Claim additional XP and Coins
- Prevent duplicate reward claims

### 6. Garden Shop
- Browse available garden items
- Filter products by category
- Purchase decorations using Coins
- Check available balance before purchase

### 7. Inventory & Decoration
- View purchased items
- Place decorations in eight garden slots
- Return decorations to inventory
- Save decoration positions in MongoDB

### 8. Statistics Dashboard
- Total habit completions
- Daily completion progress
- Current streak and best streak
- Seven-day activity chart
- Total habits and garden plants

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API

### Backend
- Node.js
- Express.js
- Express Session
- bcryptjs
- connect-mongo

### Database
- MongoDB
- MongoDB Native Driver

### Development Tools
- Visual Studio Code
- MongoDB Compass
- Nodemon
- Git and GitHub

## 📁 Project Structure

afterglow-garden/
├── server/
│   ├── app.js
│   ├── db.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   └── routes/
│       ├── authRoutes.js
│       ├── habitRoutes.js
│       ├── gardenRoutes.js
│       ├── questRoutes.js
│       ├── shopRoutes.js
│       ├── decorRoutes.js
│       └── statRoutes.js
├── public/
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── dashboard.html
│   ├── habits.html
│   ├── garden.html
│   ├── quests.html
│   ├── shop.html
│   └── statistics.html
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md

## 🚀 Installation & Setup

### Prerequisites

Install the following software:

- Node.js
- MongoDB Community Server
- Git

MongoDB must be running locally.

### Step 1: Clone the Repository

```bash
git clone https://github.com/GGornzz/afterglow-garden.git
cd afterglow-garden
```


### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root.

Copy the values from `.env.example`.

```env
MONGO_URL=mongodb://127.0.0.1:27017
DB_NAME=afterglow-garden-db
PORT=3000
SESSION_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

Generate a random session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Replace the example SESSION_SECRET with the generated value.

### Step 4: Start MongoDB

Make sure MongoDB Community Server is running.

The application uses:

mongodb://127.0.0.1:27017

### Step 5: Start the Application

```bash
npm run dev
```

Open your browser:

http://localhost:3000

### Step 6: Create an Account

Register a new account to start tracking habits.

## 🗃️ Database Design

Database name:

afterglow-garden-db

### Main Collections

#### users
Stores user accounts and reward information.

Main fields:
- _id
- username
- email
- passwordHash
- level
- xp
- coins
- claimedQuestKeys
- inventory
- gardenDecorations
- createdAt

#### habits
Stores habit information for each user.

Main fields:
- _id
- userId
- title
- description
- category
- frequency
- isActive
- createdAt
- updatedAt

#### habitLogs
Stores daily habit completion records.

Main fields:
- _id
- userId
- habitId
- logDate
- status
- earnedXP
- earnedCoins
- rewardApplied
- completedAt

#### gardenPlants
Stores virtual plants linked to user habits.

Main fields:
- _id
- userId
- habitId
- plantType
- plantedAt

#### sessions
Stores session information using connect-mongo.

### Additional Data

Quest reward claims and inventory are stored within users.

Garden decoration placements are also embedded inside users.

## 🔌 Main API Endpoints

### Authentication
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout

### Habits
GET    /api/habits
POST   /api/habits
POST   /api/habits/:id/complete
GET    /api/habits/history
PUT    /api/habits/:id
PATCH  /api/habits/:id/status
DELETE /api/habits/:id

### Garden
GET  /api/garden
GET  /api/garden/available-habits
POST /api/garden/plants

### Quests
GET  /api/quests
POST /api/quests/:id/claim

### Shop
GET  /api/shop/items
GET  /api/shop/inventory
POST /api/shop/purchase

### Decorations
GET    /api/decor
POST   /api/decor/place
DELETE /api/decor/:placementId

### Statistics
GET /api/statistics

## 🧪 Testing

The application should be tested for:

- User registration and login
- Session persistence
- Habit creation and editing
- Duplicate daily completion prevention
- XP and coin rewards
- Garden plant growth
- Duplicate quest claim prevention
- Purchases with insufficient coins
- Inventory placement and removal
- User data separation
- Dashboard and statistics accuracy

## 🎨 Design Concept

Theme: Minimal Garden

Main colors:
- Forest Green: #294A37
- Sage Green: #8FAF91
- Cream: #F7F6EF
- Mint: #E3EBDD
- Gold: #D9B66F

The design focuses on simplicity, calm colors,
personal growth, and a friendly user experience.

## ⚠️ Notes

- The application is currently configured for local development.
- MongoDB data is stored locally and is not included in GitHub.
- Environment secrets must not be committed.
- The application requires additional security hardening and
  transactional reward handling before production deployment.

## 📌 Project Type

Full-Stack Web Application

Frontend + Backend + MongoDB

## 📄 License

Created as an educational web application project.
