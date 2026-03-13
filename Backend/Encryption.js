// utils/encryption.js
// Fix: Replaced deprecated .substr() with .substring()

const crypto = require("crypto");

const algorithm = "aes-256-cbc";

function encrypt(data, secret) {
    const iv = crypto.randomBytes(16);

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest("base64")
        .substring(0, 32); // Fixed: was .substr() which is deprecated

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
        iv: iv.toString("hex"),
        encryptedData: encrypted
    };
}

function decrypt(encryptedData, iv, secret) {
    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest("base64")
        .substring(0, 32); // Fixed: was .substr() which is deprecated

    const decipher = crypto.createDecipheriv(
        algorithm,
        key,
        Buffer.from(iv, "hex")
    );

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
}

module.exports = { encrypt, decrypt };