import express from 'express';
import appRoutes from './routes/index';
import { errorHandler } from './middlewares/errors';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(appRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
