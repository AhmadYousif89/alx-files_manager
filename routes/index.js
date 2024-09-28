import { Router } from 'express';
import { getConnect, getDisconnect } from '../controllers/AuthController';
import { getStatus, getStats } from '../controllers/AppController';
import { getMe, postNew } from '../controllers/UsersController';
import { postUpload } from '../controllers/FilesController';
import { handleXToken, authenticateUser } from '../middlewares/auth';

const router = Router();

router.get('/', (_req, res) => {
  res.send('<h1>Welcome to the Files Manager API</h1>');
});
// API Overview Routes
router.get('/status', getStatus);
router.get('/stats', getStats);
// API Auth Routes
router.get('/connect', getConnect);
router.get('/disconnect', handleXToken, getDisconnect);
// API User Routes
router.post('/users', postNew);
router.get('/users/me', authenticateUser, getMe);
// API Files Routes
router.post('/files', authenticateUser, postUpload);

export default router;
