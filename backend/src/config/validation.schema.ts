import Joi from 'joi';

/*
 * Validates configuration required by the KMS backend at startup.
 * Add new variables here only when the application begins consuming them.
 */
export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),

  PORT: Joi.number().port().default(3001),

  DATABASE_URL: Joi.string()
    .uri({
      scheme: ['postgres', 'postgresql'],
    })
    .required(),

  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
});
