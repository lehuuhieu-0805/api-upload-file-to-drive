const multer = require('multer');
// multer is middleware for handling multipart/form-data
const upload = multer().array('files', 7);
const { google } = require('googleapis');
const { Readable } = require('stream');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REDIRECT_URL = process.env.REDIRECT_URL;
const FOLDER_ID = process.env.FOLDER_ID;

function route(app) {
  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Hello World!'
    });
  });

  app.post('/', async (req, res) => {
    upload(req, res, error => {
      if (error instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Please upload maximum 7 files'
          });
        }
        return res.status(500).json({
          error: error.message
        });
      } else if (error) {
        // An unknown error occurred when uploading
        return res.status(500).json({
          error: error.message
        });
      }

      const files = req.files;

      if (files.length === 0) {
        return res.status(400).json({
          error: 'Not found file to upload'
        });
      }

      const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
      oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN, scope: SCOPES });
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      async function uploadFile(file) {
        const fileMetadata = {
          name: file.originalname,
          // set folder Id
          parents: [FOLDER_ID]
        };
        const media = {
          mimeType: file.mimetype,
          // convert buffer to stream
          body: Readable.from(file.buffer),
        };
        try {
          const fileCreate = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
          });

          return await generatePublicUrl(fileCreate.data.id);
        } catch (error) {
          throw (error);
        }
      }

      async function generatePublicUrl(fileId) {
        try {
          await drive.permissions.create({
            fileId,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          });
          const file = await drive.files.get({
            fileId,
            fields: 'webViewLink, webContentLink',
          });
          // url file to view
          const url = file.data.webViewLink;
          // url file to download
          // const downloadUrl = file.data.webContentLink
          return url;
        } catch (error) {
          throw (error);
        }
      }

      Promise.all(files.map(async (file) => {
        return await uploadFile(file);
      }))
        .then((data) => res.status(201).json({
          url: data
        }))
        .catch((error) => res.status(500).json({
          error: error.message
        }));
    });
  });
}

module.exports = route; 