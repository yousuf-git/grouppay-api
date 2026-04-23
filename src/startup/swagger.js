import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GroupPay API',
      version: '1.0.0',
      description: 'API documentation for GroupPay App. <br><br><b>Developed by <a href="https://yousuf-dev.com" target="_blank">M. Yousuf</a></b>',
      contact: {
        name: 'M. Yousuf',
        url: 'https://yousuf-dev.com',
      },
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
