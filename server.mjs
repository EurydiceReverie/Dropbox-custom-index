import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { basename as localBasename } from 'path';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import multer from 'multer';
//import zipstream from 'zipstream';
//const ZipStream = zipstream.default || zipstream;
import archiver from 'archiver';

const upload = multer(); 
dotenv.config();
const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  //origin: '', // if hosted front-end in other platform, input that url - origin: 'https://your-frontend-domain.com'
  origin: '*',     //otherwise use this for global
  exposedHeaders: ['Content-Disposition'],
}));

app.use(express.json());

let ACCESS_TOKEN = null;
let REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;

async function refreshAccessToken() {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
        method: "POST",
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: REFRESH_TOKEN,
            client_id: process.env.DROPBOX_CLIENT_ID,
            client_secret: process.env.DROPBOX_CLIENT_SECRET,
        }),
    });
    const data = await res.json();
    ACCESS_TOKEN = data.access_token;
    console.log("🔄 Refreshed access token:", ACCESS_TOKEN);
}

app.get("/auth", async (req, res) => {
    const authCode = req.query.code;
    try {
        const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
            method: "POST",
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: authCode,
                grant_type: "authorization_code",
                client_id: process.env.DROPBOX_CLIENT_ID,
                client_secret: process.env.DROPBOX_CLIENT_SECRET,
                redirect_uri: "http://localhost:3000/auth", // if hosted front-end in other platform, input that url - 'https://your-backend-domain.com/auth'
            }),
        });
        const data = await tokenRes.json();
        ACCESS_TOKEN = data.access_token;
        REFRESH_TOKEN = data.refresh_token;
        console.log("✅ Got access and refresh token:", data);
        res.send(`
    <html>
        <head>
            <title>Authorized</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                .token-box {
                    background: #f0f0f0;
                    border: 1px solid #ccc;
                    padding: 10px;
                    font-family: monospace;
                    margin: 15px 0;
                    user-select: all;
                    cursor: pointer;
                }
                .copied {
                    color: green;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <h2>✅ Authorization successful!</h2>
            <p><strong>Double click the refresh token to copy it:</strong></p>
            <div class="token-box" ondblclick="copyToken()">${REFRESH_TOKEN}</div>
            <p id="status"></p>
            <script>
                function copyToken() {
                    const tokenBox = document.querySelector('.token-box');
                    const range = document.createRange();
                    range.selectNode(tokenBox);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    document.execCommand('copy');
                    document.getElementById('status').innerHTML = '<span class="copied">📋 Copied to clipboard!</span>';

                    setTimeout(() => {
                        window.location.href = "/";
                    }, 2000);
                }
            </script>
        </body>
    </html>
`);
    } catch (err) {
        console.error("OAuth error:", err);
        res.status(500).send("Token exchange failed");
    }
});

function ensureAuthorized(req, res, next) {
    if (!ACCESS_TOKEN) {
        return res.status(401).send("Authorization required. Go to Dropbox auth link first.");
    }
    next();
}

app.get("/api/list", ensureAuthorized, async (req, res) => {
    const pathValue = req.query.path || "";
    try {
        const result = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                path: pathValue,
                recursive: false,
            }),
        });
        const { entries } = await result.json();
        const treeData = entries.map(entry => ({
            name: entry.name,
            type: entry[".tag"] === "file" ? "file" : "folder",
            modified: entry.server_modified,
            size: entry.size,
            path_display: entry.path_display,
            id: entry.id
        }));
        res.json(treeData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/upload', ensureAuthorized, upload.array('files'), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }
  const folderName = req.query.folderName ?? 'default-folder';
  const uploadFolderPath = folderName
    ? path.join(__dirname, 'uploads', folderName)
    : path.join(__dirname, 'uploads');
  fs.mkdirSync(uploadFolderPath, { recursive: true });
  try {
    for (const file of files) {
      const localFilePath = path.join(uploadFolderPath, file.originalname);
      fs.writeFileSync(localFilePath, file.buffer);

      //const dropboxPath = folderName
       // ? `/${folderName}/${file.originalname}`
       // : `/${file.originalname}`;

       const baseDropboxPath = '/Shared Folder Uploads';
const dropboxPath = folderName
  ? `${baseDropboxPath}/${folderName}/${file.originalname}`
  : `${baseDropboxPath}/${file.originalname}`;

      const dropboxRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path: dropboxPath,
            mode: 'add',
            autorename: true,
            mute: false,
            strict_conflict: false,
          }),
        },
        body: file.buffer,
      });
      if (!dropboxRes.ok) {
        const errorText = await dropboxRes.text();
        console.error(`Dropbox upload error for file ${file.originalname}:`, errorText);
        throw new Error(`Failed to upload ${file.originalname}: ${errorText}`);
      }
    }
    res.status(200).send('Files uploaded successfully to Dropbox.');
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send(err.message);
  }
});

app.post("/api/download", ensureAuthorized, async (req, res) => {
    const filePath = req.body.path;
    try {
        const result = await fetch("https://content.dropboxapi.com/2/files/download", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
            },
        });

        if (!result.ok) {
            const errorText = await result.text();
            console.error("❌ Dropbox API error:", errorText);
            return res.status(result.status).send(`Download failed: ${errorText}`);
        }

       const metadataHeader = result.headers.get('dropbox-api-result');
        const metadata = JSON.parse(metadataHeader || '{}');
        const filename = metadata.name || 'downloaded-file.unknown';
        const contentType = result.headers.get('Content-Type') || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Transfer-Encoding', 'chunked');

        await pipeline(result.body, res);
    } catch (err) {
        console.error("🚨 Download error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/downloadZip', ensureAuthorized, async (req, res) => {
    const paths = req.body.paths;
    if (!paths || paths.length === 0) {
        return res.status(400).json({ error: 'No paths provided' });
    }

    try {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=archive.zip');

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.on('error', err => {
            console.error('Archiver error:', err);
            res.status(500).end();
        });

        archive.pipe(res);

        for (const filePath of paths) {
            await addFilesToArchive(archive, filePath);
        }

        archive.finalize();
    } catch (error) {
        console.error('Critical Error creating zip:', error);
        res.status(500).json({ error: 'Failed to create zip archive: ' + error.message });
    }
});

async function addFilesToArchive(archive, filePath) {
    const metadataResponse = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: filePath }),
    });

    if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        throw new Error(`Error getting metadata for ${filePath}: ${errorText}`);
    }

    const metadata = await metadataResponse.json();

    if (metadata[".tag"] === "file") {
        const downloadResponse = await fetch("https://content.dropboxapi.com/2/files/download", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Dropbox-API-Arg": JSON.stringify({ path: metadata.path_display }),
            },
        });

        if (!downloadResponse.ok) {
            throw new Error(`Error downloading file ${metadata.path_display}: ${await downloadResponse.text()}`);
        }

        archive.append(downloadResponse.body, {
            name: metadata.path_display.replace(/^\/+/, ''),
        });
    } else if (metadata[".tag"] === "folder") {
        const listResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: metadata.path_display }),
        });

        if (!listResponse.ok) {
            const errorText = await listResponse.text();
            throw new Error(`Error listing folder ${metadata.path_display}: ${errorText}`);
        }

        const { entries } = await listResponse.json();

        for (const entry of entries) {
            await addFilesToArchive(archive, entry.path_display);
        }
    } else {
        throw new Error(`Unknown tag for ${filePath}: ${metadata[".tag"]}`);
    }
}

app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);

    if (REFRESH_TOKEN) {
        await refreshAccessToken();
        setInterval(refreshAccessToken, 3 * 60 * 60 * 1000);
    } else {
        console.log("❗ No refresh token yet. Go to:");
        console.log(`https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${process.env.DROPBOX_CLIENT_ID}&token_access_type=offline&redirect_uri=http://localhost:3000/auth&scope=files.content.write%20files.metadata.read%20sharing.read%20files.content.read%20files.metadata.write`);
    }
});