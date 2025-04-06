const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Endpoint do pobierania informacji o osobach, które mają urodziny
router.get('/birthday', async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query('SELECT * FROM Birthdays WHERE CONVERT(date, GETDATE()) = CONVERT(date, BirthdayDate)');
        if (result.recordset.length > 0) {
            res.json({
                name: result.recordset[0].Name,
                position: result.recordset[0].Position,
                imageUrl: result.recordset[0].ImageUrl
            });
        } else {
            res.json({});
        }
    } catch (err) {
        console.error('Błąd podczas pobierania danych o urodzinach:', err);
        res.status(500).json({ error: 'Błąd podczas pobierania danych o urodzinach' });
    }
});

module.exports = router;
