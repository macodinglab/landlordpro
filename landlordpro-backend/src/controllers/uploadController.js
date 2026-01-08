const uploadFile = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Construct public URL
        // Assuming the server serves 'uploads' at /uploads
        const protocol = req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            fileUrl: fileUrl,
            filename: req.file.filename
        });
    } catch (err) {
        console.error('Upload Logic Error:', err);
        res.status(500).json({ success: false, message: 'File upload failed' });
    }
};

module.exports = {
    uploadFile
};
