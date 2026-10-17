// Gleiche Regeln wie die App (frontend/eslint.config.js), dazu die Grenze des
// Kerns: kein React, kein Import aus der App. Erlaubt sind nur eigene Module.
import app from '../../frontend/eslint.config.js';

export default [
  ...app,
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react/*'],
              message: 'Der Kern kennt kein React.',
            },
            {
              group: ['**/frontend/**'],
              message: 'Der Kern importiert nichts aus der App.',
            },
          ],
        },
      ],
    },
  },
];
