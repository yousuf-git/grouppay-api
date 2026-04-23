import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GroupPay API',
      version: '1.0.0',
      description: 'API documentation for GroupPay App',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/up/*.js', './src/controllers/up/*.js'],
};

const specs = swaggerJsdoc(options);

export default (app) => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
};
