// --- STEP 6: Generic Joi validation middleware ---
// Usage: router.post('/route', validate(schema), controller)
// Returns { message, statusCode: 400 } on validation failure.

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      // Join all validation error messages into one readable string
      const message = error.details.map((d) => d.message).join('. ');
      return res.status(400).json({ message, statusCode: 400 });
    }

    next();
  };
};

module.exports = { validate };
