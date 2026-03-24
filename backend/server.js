const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Tesseract = require('tesseract.js');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Multer storage config for uploaded files.
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB limit per image
  },
});

// Initialize Ethereum objects from environment variables.
const provider = new ethers.JsonRpcProvider(
  process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545'
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);

// Keep ABI minimal by only declaring used functions.
const contractAbi = [
  'function storeVerification(string memory hash, bool status) public',
  'function getVerification(address user) public view returns (string memory, bool)',
];

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS || ethers.ZeroAddress,
  contractAbi,
  wallet
);

// Basic simulated "AI" face check.
// This demo compares image file sizes and treats close sizes as likely match.
function verifyFaceMock(idImagePath, selfieImagePath) {
  const idStats = fs.statSync(idImagePath);
  const selfieStats = fs.statSync(selfieImagePath);

  const larger = Math.max(idStats.size, selfieStats.size);
  const delta = Math.abs(idStats.size - selfieStats.size);
  const differenceRatio = larger === 0 ? 1 : delta / larger;

  // Threshold can be tuned; lower means stricter.
  return differenceRatio < 0.35;
}

// Cleanup helper so uploaded files do not accumulate on disk.
function safeUnlink(filePath) {
  if (!filePath) return;

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.warn(`Failed to delete file ${filePath}:`, error.message);
  }
}

app.post(
  '/verify',
  upload.fields([
    { name: 'idImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 },
  ]),
  async (req, res) => {
    const idPath = req.files?.idImage?.[0]?.path;
    const selfiePath = req.files?.selfieImage?.[0]?.path;

    if (!idPath || !selfiePath) {
      return res.status(400).json({ error: 'Both ID image and selfie are required.' });
    }

    let extractedText = '';

    try {
      // OCR on uploaded ID card image.
      const ocrResult = await Tesseract.recognize(idPath, 'eng');
      extractedText = ocrResult.data.text.trim();

      // Simulated face verification (replace with real model in production).
      const verified = verifyFaceMock(idPath, selfiePath);

      // Generate proof hash from OCR text.
      const hash = crypto.createHash('sha256').update(extractedText).digest('hex');

      // Write verification data to Ethereum smart contract.
      const tx = await contract.storeVerification(hash, verified);
      await tx.wait();

      return res.json({
        extractedText,
        verified,
        hash,
      });
    } catch (error) {
      console.error('Verification flow error:', error);
      return res.status(500).json({
        error:
          'Verification failed. Please confirm Ganache, contract address, and private key configuration.',
      });
    } finally {
      safeUnlink(idPath);
      safeUnlink(selfiePath);
    }
  }
);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${error.message}` });
  }

  if (error) {
    return res.status(500).json({ error: 'Unexpected server error.' });
  }

  return next();
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
