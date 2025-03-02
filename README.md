# Dịch thuật mỗi ngày với tiếng anh

A daily translation practice platform, helping users improve their language skills through consistent practice.

## Features

- Community-based learning with daily translation exercises
- Post and translate content in multiple languages
- AI-powered translation scoring
- Streak system for motivation and tracking progress
- Cultivation-themed ranks (Luyện Thuật Sư & Võ Sư paths)
- User vocabulary management
- Automated content scheduling

## Technology Stack

- **Frontend**: React, Bootstrap, Axios
- **Backend**: Express.js, Node.js
- **Database**: MySQL
- **Authentication**: JWT, Google OAuth
- **AI Integration**: Google Gemini AI

## Project Structure

The project follows a specific folder structure:

```
motivation-streak/
├── client/               # Frontend React application
│   ├── public/           # Static files
│   ├── src/              # Source code
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Utility functions
│   │   │   └── api.js    # Centralized API configuration
│   │   └── App.js        # Main application component
│   ├── .env              # Environment variables
│   └── package.json      # Frontend dependencies
├── server/               # Backend Express application
│   ├── controllers/      # Request handlers
│   ├── database/         # Database models and migrations
│   ├── middleware/       # Custom middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── server.js         # Main server file
└── README.md             # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- MySQL (v8 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/motivation-streak.git
   cd motivation-streak
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env` in both client and server folders
   - Update the values according to your environment

5. Initialize the database:
   ```bash
   cd ../server
   npm run init-db
   ```

6. Start the development servers:
   - For the server:
     ```bash
     cd server
     npm run dev
     ```
   - For the client:
     ```bash
     cd client
     npm start
     ```

## API Configuration

The project uses a centralized API configuration in `client/src/utils/api.js`. This provides:

- A pre-configured Axios instance with the base URL
- Authentication headers automatically added to requests
- Automatic token refresh and error handling
- Organized API endpoints by feature

To use the API in your components:

```javascript
import { userAPI, communityAPI } from '../utils/api';

// Example usage
const fetchUserProfile = async () => {
  try {
    const response = await userAPI.updateProfile({ username: 'newUsername' });
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Environment Variables

### Client

- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_NAME`: Application name
- `REACT_APP_PRIMARY_COLOR`: Primary theme color
- `REACT_APP_GOOGLE_CLIENT_ID`: Google OAuth client ID

### Server

- `PORT`: Server port
- `CLIENT_URL`: Frontend URL for CORS
- `DB_HOST`: Database host
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `JWT_SECRET`: Secret for JWT tokens
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GEMINI_API_KEY`: Google Gemini AI API key

## Contribution

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request