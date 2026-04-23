import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './startup/routes.js';
import swagger from './startup/swagger.js';
import { errorResponse } from './services/utilities.service.js';
import { StatusCodes } from 'http-status-codes';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Swagger
swagger(app);

// Routes
routes(app);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';
  return errorResponse(res, statusCode, message);
});

// 404 Handler
app.use((req, res) => {
  return errorResponse(res, StatusCodes.NOT_FOUND, 'Route not found');
});

export { app };
