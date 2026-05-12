<div align="center">

<img src="extensions/icon.svg" alt="Instagram DM Deleter icon" width="112" height="112">

# Instagram DM Deleter

### 🚀 Delete your Instagram DM messages, remove your reactions, and extract your session ID with a local Chrome extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-00a393.svg)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-635BFF.svg)](https://instagram-dm-deleter.onrender.com/)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-14B8A6.svg)](https://chromewebstore.google.com/detail/instagram-session-id-extr/baddfoiaccpbmcefgoepoopnmompackc)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

![GitHub stars](https://img.shields.io/github/stars/mertdevx/Instagram-DM-Deleter?style=social)
![GitHub forks](https://img.shields.io/github/forks/mertdevx/Instagram-DM-Deleter?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/mertdevx/Instagram-DM-Deleter?style=social)

[Live Demo](https://instagram-dm-deleter.onrender.com/) • [Features](#-features) • [Chrome Extension](#-chrome-extension) • [Quick Start](#-quick-start) • [Project Structure](#-project-structure) • [API Documentation](#-api-documentation)

<br>

### 🌐 Live Demo

Try the hosted version instantly on Render:

[![Open Live Demo](https://img.shields.io/badge/Open%20Live%20Demo-instagram--dm--deleter.onrender.com-635BFF?style=for-the-badge&logo=render&logoColor=white)](https://instagram-dm-deleter.onrender.com/)

</div>

---

## 🎯 Why This Tool?

Ever sent a message you regret? Want to clean up your DM history or remove emoji reactions you added to other people’s messages? This tool makes it **simple, fast, and local-first** to manage your Instagram DM cleanup flow.

<div align="center">

[![Install from Chrome Web Store](https://img.shields.io/badge/Install%20Extension-Chrome%20Web%20Store-14B8A6?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/instagram-session-id-extr/baddfoiaccpbmcefgoepoopnmompackc)

</div>

<div align="center">

### ⚡ One Docker Command to Rule Them All

```bash
docker run -d --name instagram-dm-deleter -p 3000:80 ghcr.io/mertdevx/instagram-dm-deleter:latest
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
- Companion Chrome extension for session ID extraction

### 💬 **Smart Conversation Management**
- View all DM threads
- Real-time search & filter
- Load older messages by scrolling upward

### 🎯 **Selective Deletion**
- Choose specific messages
- Bulk operations support
- Remove your own emoji reactions from other users’ messages

</td>
<td width="50%">

### 🚀 **Lightning Fast**
- Built with FastAPI
- Optimized performance
- Instant response times

### 🎨 **Beautiful UI**
- Enterprise-inspired responsive design
- Conversation and message counters
- Mobile-friendly

### 🐳 **Docker Ready**
- One-command deployment
- No complex setup
- Works everywhere

### 🧩 **Chrome Extension**
- Manifest V3 extension included
- Local popup UI
- PNG + SVG project icon assets

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

- 🐳 Docker
- 📱 Instagram account

### Installation

```bash
# Start the prebuilt production image
docker run -d --name instagram-dm-deleter -p 3000:80 ghcr.io/mertdevx/instagram-dm-deleter:latest

# Open in your browser
# 🌐 http://localhost:3000
```

### Stop / Remove

```bash
docker stop instagram-dm-deleter
docker rm instagram-dm-deleter
```

### Development Build

If you want to build the project locally instead of using the prebuilt image:

```bash
git clone https://github.com/mertdevx/Instagram-DM-Deleter.git
cd Instagram-DM-Deleter
docker compose up --build
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

## 🧩 Chrome Extension

The companion Chrome extension is now published on the Chrome Web Store and is also included locally under [`extensions/`](extensions/) for development.

<div align="center">

[![Install from Chrome Web Store](https://img.shields.io/badge/Install%20Extension-Chrome%20Web%20Store-14B8A6?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/instagram-session-id-extr/baddfoiaccpbmcefgoepoopnmompackc)

</div>

### Extension Highlights

- Published name: **Instagram Session ID Extractor**
- In-app branding: **Instagram DM Deleter**
- Reads only the `sessionid` cookie from `https://www.instagram.com/*`
- No remote code, CDN scripts, or external services
- Includes enterprise-style SVG and PNG icon assets

### Extension Files

```text
extensions/
├── icon.svg             # Source project icon used in README
├── icon-16.png          # Chrome extension icon
├── icon-32.png          # Chrome extension icon
├── icon-48.png          # Popup logo / toolbar icon
├── icon-128.png         # Chrome Web Store icon
├── manifest.json        # Manifest V3 metadata and permissions
├── popup.html           # Self-contained popup UI
├── popup.js             # Cookie reading and clipboard logic
└── _metadata/           # Chrome-generated metadata when packaged
```

> The manifest uses PNG icons for Chrome compatibility, while the SVG is kept as the source project icon.

---

## 🏗️ Architecture

<div align="center">

```mermaid
graph LR
    E[🧩 Chrome Extension<br/>Session ID Extractor] -->|Copy sessionid| A[🌐 Frontend<br/>Nginx]
    A -->|API Calls| B[⚡ Backend<br/>FastAPI]
    B -->|Instagram Private API| C[📱 Instagram]
    
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
│   │   ├── instagram.py       # Instagram API wrapper, pagination, reactions
│   │   └── models.py          # Pydantic models
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Backend container
│   └── .dockerignore
│
├── 🧩 extensions/
│   ├── manifest.json          # Chrome Manifest V3 configuration
│   ├── popup.html             # Extension popup interface
│   ├── popup.js               # Cookie extraction and clipboard logic
│   ├── icon.svg               # Source project icon
│   ├── icon-16.png            # Extension icon asset
│   ├── icon-32.png            # Extension icon asset
│   ├── icon-48.png            # Extension icon asset
│   ├── icon-128.png           # Extension icon asset
│   └── _metadata/             # Generated extension metadata
│
├── 🐳 docker-compose.yml      # Multi-container setup
├── 🐳 Dockerfile              # Single-image production build
├── 🐳 docker/
│   ├── nginx.conf             # Single-container nginx reverse proxy
│   └── supervisord.conf       # Runs backend and nginx in one container
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
GET /api/threads/{thread_id}/messages?limit=20&cursor=optional_cursor
X-Session-ID: your_session_id
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "item_id",
      "user_id": 123456789,
      "user_name": "username",
      "text": "Message text",
      "timestamp": 1710000000,
      "is_mine": true,
      "my_reactions": [],
      "has_my_reactions": false
    }
  ],
  "next_cursor": "older_messages_cursor",
  "has_older": true
}
```

Use `next_cursor` to load older messages when scrolling upward.

### Unsend Messages & Remove Reactions

```http
POST /api/messages/unsend
X-Session-ID: your_session_id
Content-Type: application/json

{
  "thread_id": "340282366841710300949128135266365332153",
  "message_ids": [
    "msg_1",
    "msg_2",
    "reaction:target_item_id:❤️"
  ]
}
```

Reaction IDs use the `reaction:<message_item_id>:<emoji>` format and remove reactions made by the current user on another user’s message.

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
