const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.post('/register', authMiddleware.verifyToken, authController.register);
router.get('/all-users', authMiddleware.verifyToken, authMiddleware.verifyAdmin, authController.getAllUsers);

module.exports = router;