import { Router } from 'express';
import { getStatus, getStats } from '../controllers/AppController';
import { getMe, postNew } from '../controllers/UsersController';
import { getConnect, getDisconnect } from '../controllers/AuthController';
import { postUpload } from '../controllers/FilesController';
import checkXTokenHeader from '../middlewares/auth';

const router = Router();

router.get('/', (req, res) => {
  res.send('<h1>Welcome to the Files Manager API</h1>');
});
// API Overview Routes
router.get('/status', getStatus);
router.get('/stats', getStats);
// API Auth Routes
router.get('/connect', getConnect);
router.get('/disconnect', checkXTokenHeader, getDisconnect);
// API User Routes
router.post('/users', postNew);
router.get('/users/me', checkXTokenHeader, getMe);
// API Files Routes
router.post('/files', checkXTokenHeader, postUpload);

export default router;
