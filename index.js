// callback-server.js
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());

// Skema Saldo (Schema untuk saldo pengguna)
const saldoSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
});

const Saldo = mongoose.model('Saldo', saldoSchema);

// Koneksi ke MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

const updateSaldo = async (userId, amount) => {
  try {
    const userSaldo = await Saldo.findOne({ userId });
    if (userSaldo) {
      userSaldo.balance += amount;
      await userSaldo.save();
      console.log(`Saldo user ${userId} berhasil diupdate: +Rp ${amount}`);
    } else {
      const newSaldo = new Saldo({ userId, balance: amount });
      await newSaldo.save();
      console.log(`Saldo user ${userId} berhasil dibuat: Rp ${amount}`);
    }
  } catch (error) {
    console.error('Error saat update saldo:', error);
  }
};

// Endpoint callback yang akan dipanggil oleh sistem pembayaran
app.post('/callback', async (req, res) => {
  const { external_id, status, amount } = req.body;

  if (!external_id || !status || !amount) {
    return res.status(400).send('Missing required fields in callback');
  }

  if (status === 'PAID') {
    const userId = external_id.split('_')[0];

    try {
      await updateSaldo(userId, amount);

      const message = `<b>[Deposit QRIS]</b>\n\n` +
                      `<b>🔹 User ID:</b> <code>${userId}</code>\n` +
                      `<b>🔹 Amount:</b> Rp ${amount}\n\n` +
                      `<i>Saldo berhasil ditambahkan.</i>`;
      await axios.post(`https://api.telegram.org/bot${process.env.TOKEN}/sendMessage`, {
        chat_id: process.env.OWNER_ID,
        text: message,
        parse_mode: 'HTML',
      });

      res.send('Callback diterima');
    } catch (error) {
      console.error('Error saat memproses callback:', error);
      res.status(500).send('Internal server error');
    }
  } else {
    console.log(`Status pembayaran bukan PAID: ${status}`);
    res.send('Status bukan PAID');
  }
});

// Menjalankan server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});
