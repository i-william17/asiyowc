const { v4: uuidv4 } = require('uuid');

const responseFormatter = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function (data) {
    if (typeof data === 'object' && !data.animation) {
      // Add animation metadata to responses
      data.animation = {
        id: uuidv4(),
        timestamp: Date.now(),
        states: {
          initial: { opacity: 0, scale: 0.8 },
          entering: { 
            opacity: 1, 
            scale: 1,
            transition: { duration: 0.5, ease: 'easeOut' }
          }
        }
      };
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

const successResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
    animation: {
      id: uuidv4(),
      timestamp: Date.now(),
      states: {
        initial: { opacity: 0, scale: 0.8 },
        entering: { 
          opacity: 1, 
          scale: 1,
          transition: { duration: 0.5, ease: 'easeOut' }
        }
      }
    }
  };
};

const errorResponse = (message = 'Error', statusCode = 500, errors = null) => {
  return {
    success: false,
    statusCode,
    message,
    errors,
    timestamp: new Date().toISOString(),
    animation: {
      id: uuidv4(),
      timestamp: Date.now(),
      states: {
        initial: { opacity: 0, scale: 0.8 },
        entering: { 
          opacity: 1, 
          scale: 1,
          transition: { duration: 0.5, ease: 'easeOut' }
        }
      }
    }
  };
};

module.exports = {
  responseFormatter,
  successResponse,
  errorResponse
};
