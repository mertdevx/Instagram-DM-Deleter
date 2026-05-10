<div align="center">

<img src="extensions/icon.svg" alt="Instagram DM Deleter icon" width="112" height="112">

# Instagram DM Deleter

### 🚀 Effortlessly delete your Instagram DM messages with a beautiful, modern interface

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-00a393.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

![GitHub stars](https://img.shields.io/github/stars/mertdevx/Instagram-DM-Deleter?style=social)
![GitHub forks](https://img.shields.io/github/forks/mertdevx/Instagram-DM-Deleter?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/mertdevx/Instagram-DM-Deleter?style=social)

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 Why This Tool?

Ever sent a message you regret? Want to clean up your DM history? This tool makes it **simple, fast, and secure** to delete your Instagram messages without any hassle.

<div align="center">

### ⚡ One Command to Rule Them All

```bash
docker-compose up -d
```

**That's it!** Your app is running on `http://localhost:3000`

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔐 **Secure Authentication**
- Session ID based login
- No password storage
- Your credentials stay safe

### 💬 **Smart Conversation Management**
- View all DM threads
- Real-time search & filter
- Clean, intuitive interface

### 🎯 **Selective Deletion**
- Choose specific messages
- Bulk operations support
- Only your messages

</td>
<td width="50%">

### 🚀 **Lightning Fast**
- Built with FastAPI
- Optimized performance
- Instant response times

### 🎨 **Beautiful UI**
- Modern, responsive design
- Instagram-like interface
- Mobile-friendly

### 🐳 **Docker Ready**
- One-command deployment
- No complex setup
- Works everywhere

</td>
</tr>
</table>

---

## 📸 Demo

<div align="center">

### 🔐 Session Login
<img src="https://dummyimage.com/800x400/0095f6/ffffff&text=Session+ID+Login+Screen" alt="Login Screen" width="80%">

### 💬 Conversation List
<img src="https://dummyimage.com/800x400/fafafa/262626&text=DM+Conversations+List" alt="Conversations" width="80%">

### 📝 Message Deletion
<img src="https://dummyimage.com/800x400/0095f6/ffffff&text=Delete+Messages+Interface" alt="Delete Interface" width="80%">

</div>

---

## 🚀 Quick Start

### Prerequisites

- 🐳 Docker & Docker Compose
- 📱 Instagram account

### Installation

```bash
# 1️⃣ Clone the repository
git clone https://github.com/mertdevx/Instagram-DM-Deleter.git
cd Instagram-DM-Deleter

# 2️⃣ Start the application
docker-compose up -d

# 3️⃣ Open in your browser
# 🌐 http://localhost:3000
```

### Getting Your Session ID

<details>
<summary>📖 Click to expand step-by-step guide</summary>

1. **Open Instagram** in your browser and login
2. **Press F12** to open Developer Tools (or right-click → Inspect)
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Navigate to **Cookies** → **https://www.instagram.com**
5. Find the `sessionid` cookie in the list
6. **Copy the Value** (it's a long string of characters)
7. **Paste it** in the app's input field and click Connect

<div align="center">
<img src="https://dummyimage.com/700x350/ffffff/000000&text=Find+sessionid+in+Cookies" alt="Session ID Guide" width="70%">
</div>

> 💡 **Tip:** The session ID is usually 30-40 characters long and contains letters and numbers.

</details>

---

## 🏗️ Architecture

<div align="center">

```mermaid
graph LR
    A[🌐 Frontend<br/>Nginx] -->|API Calls| B[⚡ Backend<br/>FastAPI]
    B -->|Instagram API| C[📱 Instagram]
    
    style A fill:#61dafb
    style B fill:#009688
    style C fill:#E1306C
```

</div>

### Tech Stack

<table>
<tr>
<td align="center" width="33%">

### 🎨 Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

</td>
<td align="center" width="33%">

### ⚡ Backend
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Uvicorn](https://img.shields.io/badge/Uvicorn-2C5BB4?style=for-the-badge&logo=gunicorn&logoColor=white)

</td>
<td align="center" width="33%">

### 🐳 DevOps
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)

</td>
</tr>
</table>

---

## 📁 Project Structure

```
Instagram-DM-Deleter/
├── 🎨 frontend/
│   ├── css/
│   │   └── style.css          # Modern, responsive styles
│   ├── js/
│   │   ├── app.js             # Main application logic
│   │   ├── api.js             # API client
│   │   └── ui.js              # UI helpers
│   ├── index.html             # Single page application
│   ├── nginx.conf             # Nginx configuration
│   └── Dockerfile             # Frontend container
│
├── ⚡ backend/
│   ├── app/
│   │   ├── main.py            # FastAPI application
│   │   ├── instagram.py       # Instagram API wrapper
│   │   └── models.py          # Pydantic models
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Backend container
│   └── .dockerignore
│
├── 🐳 docker-compose.yml      # Multi-container setup
├── 🔧 .github/
│   └── workflows/
│       └── docker-build.yml   # CI/CD pipeline
├── 📝 README.md
├── 📄 LICENSE
└── .gitignore
```

---

## 🔌 API Documentation

<details>
<summary>📚 View API Endpoints</summary>

### Authentication

```http
POST /api/session
Content-Type: application/json

{
  "session_id": "your_instagram_session_id"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "pk": 123456789,
    "username": "your_username",
    "full_name": "Your Name",
    "profile_pic_url": "https://..."
  }
}
```

### Get Conversations

```http
GET /api/threads
X-Session-ID: your_session_id
```

**Response:**
```json
{
  "success": true,
  "threads": [
    {
      "thread_id": "340282366841710300949128135266365332153",
      "thread_title": "John Doe",
      "users": [...],
      "last_message": "Hey, how are you?",
      "last_activity": "2026-04-10T21:00:00Z"
    }
  ]
}
```

### Get Messages

```http
GET /api/threads/{thread_id}/messages
X-Session-ID: your_session_id
```

### Delete Messages

```http
POST /api/messages/delete
X-Session-ID: your_session_id
Content-Type: application/json

{
  "thread_id": "340282366841710300949128135266365332153",
  "message_ids": ["msg_1", "msg_2", "msg_3"]
}
```

**Response:**
```json
{
  "success": true,
  "unsent": 3,
  "failed": 0
}
```

</details>

---

## 🛠️ Development

### Local Development (Without Docker)

<details>
<summary>🔧 Setup Instructions</summary>

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
python -m http.server 3000
```

</details>

### Building Docker Images

```bash
# Build backend
docker build -t dm-unsender-backend ./backend

# Build frontend
docker build -t dm-unsender-frontend ./frontend

# Or build both with compose
docker-compose build
```

---

## ⚠️ Important Notes

<table>
<tr>
<td width="33%" align="center">

### 🔐 Security
- Never share your session ID
- Logout when finished
- Use on trusted devices only

</td>
<td width="33%" align="center">

### ⏱️ Rate Limiting
- Instagram has API limits
- 1 second delay between operations
- Don't spam unsend requests

</td>
<td width="33%" align="center">

### ⚖️ Legal
- Educational purposes only
- May violate Instagram ToS
- Use at your own risk

</td>
</tr>
</table>

---

## 🤝 Contributing

We love contributions! Here's how you can help:

<div align="center">

[![Contributors](https://img.shields.io/github/contributors/mertdevx/Instagram-DM-Deleter?style=for-the-badge)](https://github.com/mertdevx/Instagram-DM-Deleter/graphs/contributors)

</div>

1. 🍴 Fork the repository
2. 🌿 Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. 💾 Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push to the branch (`git push origin feature/AmazingFeature`)
5. 🎉 Open a Pull Request

### Development Guidelines

- ✅ Write clean, documented code
- ✅ Follow existing code style
- ✅ Test your changes
- ✅ Update documentation

---

## 📊 Stats

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/mertdevx/Instagram-DM-Deleter?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/mertdevx/Instagram-DM-Deleter?style=for-the-badge)
![GitHub code size](https://img.shields.io/github/languages/code-size/mertdevx/Instagram-DM-Deleter?style=for-the-badge)

</div>

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

---

## 🙏 Acknowledgments

<div align="center">

Special thanks to these amazing projects:

[![instagrapi](https://img.shields.io/badge/instagrapi-Instagram_API-E1306C?style=for-the-badge)](https://github.com/adw0rd/instagrapi)
[![FastAPI](https://img.shields.io/badge/FastAPI-Framework-009688?style=for-the-badge)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Container-2496ED?style=for-the-badge)](https://www.docker.com/)

</div>

---

## 📧 Contact & Support

<div align="center">

[![GitHub Issues](https://img.shields.io/github/issues/mertdevx/Instagram-DM-Deleter?style=for-the-badge)](https://github.com/mertdevx/Instagram-DM-Deleter/issues)
[![GitHub Discussions](https://img.shields.io/github/discussions/mertdevx/Instagram-DM-Deleter?style=for-the-badge)](https://github.com/mertdevx/Instagram-DM-Deleter/discussions)

**Found a bug?** [Open an issue](https://github.com/mertdevx/Instagram-DM-Deleter/issues/new)

**Have a question?** [Start a discussion](https://github.com/mertdevx/Instagram-DM-Deleter/discussions/new)

</div>

---

<div align="center">

### ⭐ Star this repo if you find it useful!

Made with ❤️ by developers, for developers

**⚠️ Disclaimer:** This tool is not affiliated with, authorized, maintained, sponsored or endorsed by Instagram or Meta Platforms, Inc. Use at your own risk.

---

[![Star History Chart](https://api.star-history.com/svg?repos=mertdevx/Instagram-DM-Deleter&type=Date)](https://star-history.com/#mertdevx/Instagram-DM-Deleter&Date)

</div>
