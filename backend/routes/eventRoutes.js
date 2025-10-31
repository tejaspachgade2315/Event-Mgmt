const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware.verifyToken, authMiddleware.verifyAdmin, eventController.createEvent);
router.patch('/:id', authMiddleware.verifyToken, eventController.updateEvent);
router.get('/', authMiddleware.verifyToken, eventController.listEventsForUser);
router.get('/:id', authMiddleware.verifyToken, eventController.getEventById);
router.get('/logs/:id', authMiddleware.verifyToken, eventController.getEventLogs);

module.exports = router;