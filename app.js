const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

const app = express();
app.use(cors());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // 确保上传目录存在
        const uploadPath = path.join(uploadsDir, req.body.path || ''); // 使用req.body.path处理子目录
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const cleanName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf8');
        cb(null, cleanName)
    }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.array('files'), (req, res) => {
    console.log(req.files);
    res.send('Files uploaded successfully.');
});

app.use('/uploads', express.static(uploadsDir));

app.get('/files', (req, res) => {
    const directoryPath = path.join(uploadsDir, req.query.path || '');
    fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
            console.error('Failed to list files:', err);
            return res.status(500).send('Unable to retrieve files.');
        }
        const files = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path.join(req.query.path || '', entry.name)
        }));
        res.json(files);
    });
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
