import { Router } from 'express';
import { getMe, postNew } from '../controllers/UsersController';
import { getStatus, getStats } from '../controllers/AppController';
import { getConnect, getDisconnect } from '../controllers/AuthController';
import { getIndex, getShow, postUpload } from '../controllers/FilesController';
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
router.get('/files', authenticateUser, getIndex);
router.get('/files/:id', authenticateUser, getShow);

export default router;
