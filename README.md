# PodPlanner

PodPlanner is a web application designed to facilitate podcast management by enabling users to plan episodes, manage topics, and collaborate seamlessly with their teams. With features like user authentication, password recovery, and a user-friendly interface, PodPlanner aims to enhance the podcast production experience.

## Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features
- User authentication (login, register, password recovery)
- Intuitive UI with responsive design
- Episode planning and management
- Team collaboration tools
- Eye-catching card layouts for notes and schedules
- Easy navigation with tabs and dialogs

## Technologies Used
- Frontend: React, Tailwind CSS, Zod, React Hook Form, Radix UI
- Backend: Node.js (if applicable; specify your backend language/framework)

## Installation
To set up the PodPlanner project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/kr3t3n/PodPlanner.git
   cd PodPlanner
   ```

2. Install the required dependencies:
   ```bash
   npm install
   ```

## Usage
To run PodPlanner locally, use the following command:

```bash
npm start
```

This will start the application on port 3000. Open your browser and go to http://0.0.0.0:3000 to access it.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Log in a user
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/forgot-password` - Send a password reset email

### Example Request

```json
POST /api/auth/login
{
    "username": "your-username",
    "password": "your-password"
}
```

## Contributing
We welcome contributions to PodPlanner! To contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request

## License
This project is licensed under the MIT License. See the LICENSE file for more information.

## 👨‍💻 Author

Created by [Georgi](https://x.com/georgipep) from Mangia Studios Limited.

## ❤️ Support

If you find Markpad useful, consider [buying me a coffee](https://www.buymeacoffee.com/georgipep) ☕
