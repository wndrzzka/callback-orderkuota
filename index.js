// callback.js
const axios = require('axios');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Database connection error:', err));

// Skema Saldo
const saldoSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
});

const Saldo = mongoose.model('Saldo', saldoSchema);

// Update or create saldo
const updateSaldo = async (userId, amount) => {
  try {
    const userSaldo = await Saldo.findOne({ userId });
    if (userSaldo) {
      userSaldo.balance += amount; // Add to balance if user exists
      await userSaldo.save();
    } else {
      const newSaldo = new Saldo({ userId, balance: amount }); // Create new saldo entry
      await newSaldo.save();
    }
    console.log(`Saldo user ${userId} berhasil diupdate: +Rp ${amount}`);
  } catch (error) {
    console.error('Error saat update saldo:', error);
  }
};

const handleCallback = async (req, res) => {
  const { external_id, status, amount } = req.body;

  if (status === 'PAID') {
    const userId = external_id.split('_')[0];

    await updateSaldo(userId, amount);

    const message = `<b>[Deposit QRIS]</b>\n\n` +
                    `<b>🔹 User ID:</b> <code>${userId}</code>\n` +
                    `<b>🔹 Amount:</b> Rp ${amount}\n\n` +
                    `<i>Saldo berhasil ditambahkan.</i>`;
    await axios.post(`https://api.telegram.org/bot${process.env.TOKEN}/sendMessage`, {
      chat_id: process.env.OWNER_ID,
      text: message,
      parse_mode: 'HTML'
    });

    res.send('Callback diterima');
  } else {
    res.send('Status bukan PAID');
  }
};
