const { checkEnv } = require('../src/config/checkEnv');

describe('checkEnv', () => {
  test('returns no problems with a URL and a secret key', () => {
    expect(checkEnv({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'sb_secret_abc' })).toEqual([]);
  });

  test('warns when the key is a publishable key', () => {
    const problems = checkEnv({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'sb_publishable_abc' });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/secret key/);
  });

  test('reports a missing URL and key', () => {
    expect(checkEnv({})).toEqual([
      'SUPABASE_URL is missing in backend/.env',
      'SUPABASE_KEY is missing in backend/.env',
    ]);
  });
});
