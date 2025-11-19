const express = require('express');
const router = express.Router();
const { createRoom, getMyRooms, getAllActiveRooms, deleteRoom, getLiveKitToken} = require('../controllers/roomController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
// Alamat API: POST /api/rooms/create
// 1. 'protect' akan cek token
// 2. 'adminOnly' akan cek role
// 3. 'createRoom' akan jalan jika lolos
router.post('/create', protect, adminOnly, createRoom);

router.get('/my-rooms', protect, adminOnly, getMyRooms);

router.get('/all', protect, getAllActiveRooms);

router.delete('/:id', protect, adminOnly, deleteRoom);

router.get('/:roomId/token', protect, getLiveKitToken);

module.exports = router;