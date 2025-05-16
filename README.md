# 📁 KK's Drive – Dropbox File Index UI

A modern Dropbox-powered file browser web UI built with a Cloudflare-hosted frontend and a Node.js backend (initially on Heroku/Fly.io).  
It supports list & grid views, folder/file browsing, zipping folders, individual file downloads, and uploads to a shared folder.  
It auto-manages Dropbox access tokens using a refresh token.

---

## 🚀 Getting Started

A complete Dropbox drive interface with the following capabilities:

- 📂 Browse files & folders in list/grid view  
- 🗂 Download individual files or entire folders as `.zip`  
- ⬆ Upload files to a shared folder (default: `/Shared Files Uploads`)  
- 🔐 Secure OAuth2.0 Dropbox integration  
- 🔁 Auto-refresh Dropbox access token every 3 hours  
- ☁ Frontend hosted on Cloudflare Pages  
- 🔧 Backend previously deployed on Heroku/Fly.io  

---

## 🧰 Prerequisites

Before installation, ensure you have:

- ✅ Node.js (v18+ recommended)  
- ✅ Git  
- ✅ Dropbox App from [Dropbox Developer Console](https://www.dropbox.com/developers/apps)  
- ✅ `.env` file with Dropbox credentials  

---

## 📦 Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/EurydiceReverie/Dropbox-custom-index.git
cd Dropbox-custom-index
```

### 2️⃣ Install Dependencies

```bash
npm install
```

---

## ⚙️ Configuration

Create a `.env` file in your root directory and add the following:

```env
DROPBOX_CLIENT_ID=your_client_id
DROPBOX_CLIENT_SECRET=your_client_secret
DROPBOX_REFRESH_TOKEN=your_refresh_token
```

---

## 🔐 Dropbox OAuth2.0 Flow

Generate your **refresh token** by visiting the following URL
```
https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&token_access_type=offline&redirect_uri=http://localhost:3000/auth&scope=files.content.write files.metadata.read sharing.read files.content.read files.metadata.write
```
You can either:

- **Manually obtain the refresh token** by completing the OAuth flow above, then copy it into your `.env` file  
**OR**
- Let the `server.mjs` handle it automatically:  
  If you **omit** the `DROPBOX_REFRESH_TOKEN` from `.env`, the server uses your `DROPBOX_CLIENT_ID` and `DROPBOX_CLIENT_SECRET` to generate and you have to store the refresh token manually in .env after authorization.  

Once stored, the refresh token is used to auto-generate new access tokens every 3 hours.

- **redirect_uri**: Use `http://localhost:3000/auth` during local development, or your hosted URL otherwise: input url - 'https://your-backend-domain.com/auth'
- **Scopes Explained**:
  - `files.metadata.read`: View file/folder metadata  
  - `files.content.read`: Download file contents  
  - `files.content.write`: Upload file contents  
  - `files.metadata.write`: Move, rename, delete files/folders  
  - `sharing.read`: Access shared links and folder info  

📌 Dropbox **does not provide permanent access tokens**.  
You must use the **refresh token** to fetch a **new access token** every 3 hours automatically.

---

🔧 **Dropbox App Setup Instructions**:
1. Visit [Dropbox Developer Console](https://www.dropbox.com/developers/apps)
2. Select your created app.
3. Under **OAuth 2**, find **Redirect URIs**
4. Add the authorized redirect URL (e.g. `http://localhost:3000/auth` or your hosted version)
5. Enable necessary permissions (scopes) such as:
   - `files.content.write`
   - `files.content.read`
   - `files.metadata.read`
   - `files.metadata.write`
   - `sharing.read`

## 🌐 Backend Routing

### 🔄 Redirect Routes

- `/up` → Redirects to `/uploads.html`
- `/upload` → Opens upload UI for sending files to Dropbox.
      For ex: `https://your-frontend-domain.com/upload`

Upload endpoint (in `server.mjs`):

```js
app.post('/api/upload', ensureAuthorized, upload.array('files'), async (req, res) => { ... });
```

- Files are uploaded to the Dropbox folder `/Shared Files Uploads` by default  
- You can change the folder path inside the backend (`server.mjs`)

// ✅ For uploading directly to the ROOT path:

      const dropboxPath = folderName ? `/${folderName}/${file.originalname}` : `/${file.originalname}`;

  
// ✅ For uploading into a specific base folder like "Shared Folder Uploads":

      const baseDropboxPath = '/Shared Folder Uploads';
      const dropboxPath = folderName ? `${baseDropboxPath}/${folderName}/${file.originalname}` : `${baseDropboxPath}/${file.originalname}`;

---

## 🖥 Frontend Configuration

### 🔌 Connecting to the Backend

In `src/index.js`:

```js
// const BACKEND_URL = ''; // Set this if frontend and backend are on different domains
```

#### Example usage:

```js
// Same domain
fetch(`/api/list?path=${folderPath}`);

// Cross-domain
fetch(`${BACKEND_URL}/api/list?path=${folderPath}`);
```

In `script.js` too:

```js
// Same domain
const res = await fetch(`/api/upload?folderName=${encodeURIComponent(folderName)}`);
```

---

## 🧩 Features

- 🗂 **List/Grid View**: Toggle between file display formats  
- 📥 **Download ZIP**: Folder zipping preserves directory structure  
- 📄 **Individual File Downloads**: Available with Dropbox file APIs  
- ⬆ **Upload Files**: Uploads to a shared Dropbox folder  
- 🔄 **Token Auto-Refresh**: Refresh token generates access tokens every 3 hrs  
- 🌍 **CORS Config**: Open CORS in development

```js
app.use(cors({
  origin: '*',
  exposedHeaders: ['Content-Disposition'],
}));
```
If you want to allow only specific cross-domain origins:

```js
// Example: Allow only your hosted frontend URL
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  exposedHeaders: ['Content-Disposition'],
}));
```

---


## ⚠️ Dropbox API Limitations

- ❌ No official API for folder download or upload  
- ✅ Folder listing and file-level APIs are supported  
- ✅ Folder zipping handled manually on backend  
- 🔐 Requires periodic access token refresh using refresh token  

---

## 📸 UI Highlights

> _Intuitive UI(redefined)!_

- List View ✔  
- Grid View ✔  
- File Path Breadcrumb ✔  
- Shared Folder Upload ✔  
- Zipping & Download ✔  

---

## 🧪 Deployment Notes

- 🔧 Backend: Node.js + Express (e.g., `server.mjs`)  
- ☁ Frontend: Cloudflare Pages (uses `public/` directory)  

---

## 📄 License

MIT License – feel free to use, modify, and share 🎉

---

## 🤝 Contributing

Pull requests are welcome!  
For major changes, open an issue to discuss what you'd like to improve.

---

## 📬 Contact

Created by [Karthik](https://github.com/EurydiceReverie)  
📧 For support, please open an issue or reach out via GitHub
