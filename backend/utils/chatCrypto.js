// utils/chatCrypto.js
const crypto = require("crypto");
require("dotenv").config();

const CHAT_KEY_ALGO = "aes-256-gcm";
const MASTER_KEY_ALGO = "aes-256-gcm";

function getMasterKey() {
  const hex = process.env.MESSAGE_MASTER_KEY;
  if (!hex) {
    throw new Error("MESSAGE_MASTER_KEY is missing");
  }

  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("MESSAGE_MASTER_KEY must be 32 bytes hex");
  }

  return key;
}

function encryptWithKey(plainText, keyBuffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(CHAT_KEY_ALGO, keyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(String(plainText || "")), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decryptWithKey(ciphertext, iv, tag, keyBuffer) {
  const decipher = crypto.createDecipheriv(
    CHAT_KEY_ALGO,
    keyBuffer,
    Buffer.from(iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function generateChatKey() {
  return crypto.randomBytes(32);
}

function encryptChatKey(chatKeyBuffer) {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(MASTER_KEY_ALGO, masterKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(chatKeyBuffer),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    encryptedChatKey: encrypted.toString("base64"),
    chatKeyIv: iv.toString("base64"),
    chatKeyTag: tag.toString("base64"),
    keyVersion: "v1",
  };
}

function decryptChatKey(encryptedChatKey, chatKeyIv, chatKeyTag) {
  const masterKey = getMasterKey();
  const decipher = crypto.createDecipheriv(
    MASTER_KEY_ALGO,
    masterKey,
    Buffer.from(chatKeyIv, "base64")
  );

  decipher.setAuthTag(Buffer.from(chatKeyTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedChatKey, "base64")),
    decipher.final(),
  ]);
}

module.exports = {
  encryptWithKey,
  decryptWithKey,
  generateChatKey,
  encryptChatKey,
  decryptChatKey,
};