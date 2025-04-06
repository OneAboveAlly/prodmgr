const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { poolPromise } = require('../database');

// Rejestracja użytkownika
router.post('/register', async (req, res) => {
    const { username, password, firstName, lastName, dateOfBirth, role } = req.body;
    const saltRounds = 10;
    
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const pool = await poolPromise;
        await pool.request()
            .input('Username', sql.NVarChar, username)
            .input('PasswordHash', sql.NVarChar, hashedPassword)
            .input('FirstName', sql.NVarChar, firstName)
            .input('LastName', sql.NVarChar, lastName)
            .input('DateOfBirth', sql.Date, dateOfBirth)
            .input('Role', sql.NVarChar, role)
            .query(`
                INSERT INTO Users (Username, PasswordHash, FirstName, LastName, DateOfBirth, Role)
                VALUES (@Username, @PasswordHash, @FirstName, @LastName, @DateOfBirth, @Role)
            `);
        res.status(201).send('User registered successfully');
    } catch (err) {
        res.status(500).send('Error registering user');
    }
});

// Logowanie użytkownika
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Username', sql.NVarChar, username)
            .query('SELECT PasswordHash FROM Users WHERE Username = @Username');
        const user = result.recordset[0];
        if (user) {
            const match = await bcrypt.compare(password, user.PasswordHash);
            if (match) {
                res.status(200).send('Login successful');
            } else {
                res.status(401).send('Invalid password');
            }
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        res.status(500).send('Error logging in');
    }
});

module.exports = router;
