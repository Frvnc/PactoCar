const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const multer = require('multer');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Solo se permiten archivos de imagen.'));
  },
});

const uploadMiddleware = (req, res, next) => {
  upload.single('foto')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'La imagen supera el tamanio maximo de 5 MB.' });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

const subirFoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen.' });

    const ext = req.file.originalname.split('.').pop().toLowerCase().replace(/[^a-z]/g, '');
    const clave = `vehiculos/${crypto.randomUUID()}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: clave,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const region = process.env.AWS_REGION || 'us-east-1';
    const url = `https://${process.env.S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${clave}`;
    return res.status(200).json({ url });
  } catch {
    return res.status(500).json({ error: 'Error al subir la imagen a S3.' });
  }
};

module.exports = { subirFoto, uploadMiddleware };
