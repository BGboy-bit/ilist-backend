// 导入所需模块
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

// 创建 Express 应用
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码的数据，包括表单数据
app.use(express.json()); // 解析 JSON 数据

// 定义上传文件的存储目录
const uploadsDir = path.join(__dirname, 'uploads');

// 如果 uploads 目录不存在，则创建该目录
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// 创建日志输出函数，带有时间戳，将日志输出到文件 ilist_log.txt
function logWithTimestamp(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(path.join(__dirname, 'ilist_log.txt'), logMessage);
}

// 配置 Multer 存储方式
const storage = multer.memoryStorage();

const upload = multer({ storage: storage }).fields([
    { name: 'files', maxCount: 10 },
    { name: 'paths' }
]);

app.post('/upload', upload, (req, res) => {
    try {
        console.log("Complete Body: ", req.body);
        console.log("paths: ", req.body.paths);
        console.log("Files: ", req.files);

        if (!req.files || !req.files['files']) {
            return res.status(400).send('No files were uploaded.');
        }

        req.files['files'].forEach((file, index) => {
            // 检查是否有路径信息，如果没有则使用默认路径
            const relativePath = req.body.paths && req.body.paths[index] ? req.body.paths[index] : file.originalname;
            const uploadPath = path.join(uploadsDir, path.dirname(relativePath));
            const fullPath = path.join(uploadPath, path.basename(relativePath));

            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
                logWithTimestamp(`Directory created: ${uploadPath}`);
            }

            fs.writeFileSync(fullPath, file.buffer);
            logWithTimestamp(`File uploaded: ${file.originalname} to ${fullPath}`);
        });

        const fileCount = req.files['files'].length;
        logWithTimestamp(`Received upload request with ${fileCount} files.`);
        res.send('Files uploaded successfully.');
    } catch (error) {
        console.error("Error during file upload:", error);
        res.status(500).send("Internal Server Error");
    }
});


// 定义静态文件路由，使上传的文件可以通过 /uploads 访问
app.use('/uploads', express.static(uploadsDir));

// 定义 GET 路由 /files，用于获取指定目录下的文件和文件夹列表
app.get('/files', (req, res) => {
    const directoryPath = path.join(uploadsDir, req.query.path || '');
    fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
            logWithTimestamp(`Failed to list files in directory: ${directoryPath}. Error: ${err.message}`);
            return res.status(500).send('Unable to retrieve files.');
        }
        const files = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path.join(req.query.path || '', entry.name)
        }));
        logWithTimestamp(`Listed files in directory: ${directoryPath}`);
        res.json(files);
    });
});

// 设置服务器监听的端口号
const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
    logWithTimestamp(`Server is running on port ${PORT}`);
});
