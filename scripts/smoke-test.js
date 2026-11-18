/**
 * End-to-end smoke test against a running instance.
 *
 *   node scripts/smoke-test.js                      # http://127.0.0.1:8787
 *   BASE_URL=https://example.com node scripts/smoke-test.js
 */
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');

let passed = 0;
const failures = [];

function check(name, condition, extra) {
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(`${name}${extra ? ` — ${extra}` : ''}`);
}

async function call(method, path, { body, headers = {}, raw } = {}) {
  const init = { method, headers: { accept: 'application/json', ...headers } };
  if (body !== undefined) {
    init.headers['content-type'] = init.headers['content-type'] ?? 'application/json';
    init.body = raw ? body : JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body (assets) */
  }
  return { status: res.status, headers: res.headers, json, text };
}

const stamp = Date.now();
const createdSlug = `smoke-test-${stamp}`;

async function main() {
  console.log(`Testing ${BASE}\n`);

  // health
  const health = await call('GET', '/api/health');
  check('GET /api/health → 200', health.status === 200, `got ${health.status}`);
  check('health says ok', health.json?.data?.status === 'ok', health.text.slice(0, 120));

  // docs page
  const docs = await call('GET', '/');
  check('GET / serves the docs page', docs.status === 200 && docs.text.includes('Personal Blog API'));
  check('docs page is html', (docs.headers.get('content-type') || '').includes('text/html'));

  // list + meta
  const list = await call('GET', '/api/articles');
  check('GET /api/articles → 200', list.status === 200, `got ${list.status}`);
  check('list returns an array', Array.isArray(list.json?.data));
  check('list has pagination meta', typeof list.json?.meta?.total === 'number');
  check('list items omit content by default', list.json?.data?.every((a) => !('content' in a)));

  // create
  const create = await call('POST', '/api/articles', {
    body: {
      title: 'Smoke Test Post',
      content: 'A short body used by the smoke test. '.repeat(20),
      tags: ['Testing', 'api'],
      status: 'draft',
    },
  });
  check('POST /api/articles → 201', create.status === 201, `got ${create.status}: ${create.text.slice(0, 200)}`);
  const article = create.json?.data;
  check('create returns the article', article?.id > 0);
  check('slug generated from title', article?.slug?.startsWith('smoke-test-post'), article?.slug);
  check('Location header points at the article', create.headers.get('location') === `/api/articles/${article?.slug}`);
  check('tags normalised to lowercase', JSON.stringify(article?.tags) === '["testing","api"]', JSON.stringify(article?.tags));
  check('excerpt auto-generated', typeof article?.excerpt === 'string' && article.excerpt.length > 0);
  check('draft has no published_at', article?.published_at === null);
  check('reading time computed', article?.reading_minutes >= 1);

  // read back
  const bySlug = await call('GET', `/api/articles/${article.slug}`);
  check('GET by slug → 200', bySlug.status === 200, `got ${bySlug.status}`);
  check('detail includes content', typeof bySlug.json?.data?.content === 'string');
  const byId = await call('GET', `/api/articles/${article.id}`);
  check('GET by id works too', byId.status === 200 && byId.json?.data?.id === article.id);

  // patch
  const before = bySlug.json.data;
  const patch = await call('PATCH', `/api/articles/${article.id}`, { body: { title: 'Smoke Test Post (edited)', status: 'published' } });
  check('PATCH → 200', patch.status === 200, `got ${patch.status}: ${patch.text.slice(0, 200)}`);
  check('PATCH applied the title', patch.json?.data?.title === 'Smoke Test Post (edited)', patch.json?.data?.title);
  check('PATCH kept untouched fields', patch.json?.data?.content === before.content);
  check('PATCH set status', patch.json?.data?.status === 'published');
  check('publishing stamps published_at', typeof patch.json?.data?.published_at === 'string');
  const firstPublishedAt = patch.json.data.published_at;
  const patch2 = await call('PATCH', `/api/articles/${article.id}`, { body: { status: 'published' } });
  check('republishing keeps the original published_at', patch2.json?.data?.published_at === firstPublishedAt);

  // put (replace) validation
  const putMissing = await call('PUT', `/api/articles/${article.id}`, { body: { title: 'Only a title' } });
  check('PUT without content → 400', putMissing.status === 400, `got ${putMissing.status}`);
  const put = await call('PUT', `/api/articles/${article.id}`, {
    body: { title: 'Replaced Post', content: 'Entirely new body text.', tags: [], status: 'draft' },
  });
  check('PUT replaces the article', put.status === 200 && put.json?.data?.title === 'Replaced Post');

  // slug change
  const slugPatch = await call('PATCH', `/api/articles/${article.id}`, { body: { slug: createdSlug } });
  check('PATCH can change the slug', slugPatch.status === 200 && slugPatch.json?.data?.slug === createdSlug);

  // conflict
  const dup = await call('POST', '/api/articles', {
    body: { title: 'Duplicate slug attempt', content: 'body', slug: createdSlug },
  });
  check('duplicate slug → 409', dup.status === 409, `got ${dup.status}`);
  check('409 body has a code', dup.json?.error?.code === 'conflict');

  // auto-suffix instead of failing
  const dupTitle = `Clashing Title ${stamp}`;
  const firstClash = await call('POST', '/api/articles', { body: { title: dupTitle, content: 'first' } });
  const autoSuffix = await call('POST', '/api/articles', {
    body: { title: dupTitle, content: 'second post with the same title' },
  });
  check('same title gets a unique slug', autoSuffix.status === 201 && autoSuffix.json.data.slug === firstClash.json.data.slug + '-2', autoSuffix.json?.data?.slug);
  const firstClashId = firstClash.json?.data?.id;
  const secondId = autoSuffix.json?.data?.id;

  // validation
  const noTitle = await call('POST', '/api/articles', { body: { content: 'orphan content' } });
  check('missing title → 400', noTitle.status === 400 && noTitle.json?.error?.details?.field === 'title');
  const badStatus = await call('POST', '/api/articles', { body: { title: 'x', content: 'y', status: 'archived' } });
  check('invalid status → 400', badStatus.status === 400, `got ${badStatus.status}`);
  const badTags = await call('POST', '/api/articles', { body: { title: 'x', content: 'y', tags: 'not-an-array' } });
  check('invalid tags → 400', badTags.status === 400);
  const badJson = await call('POST', '/api/articles', { body: '{not json', raw: true });
  check('malformed JSON → 400', badJson.status === 400);
  const wrongType = await call('POST', '/api/articles', {
    body: 'title=x',
    raw: true,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  check('wrong content-type → 415', wrongType.status === 415, `got ${wrongType.status}`);
  const emptyPatch = await call('PATCH', `/api/articles/${article.id}`, { body: {} });
  check('empty PATCH → 400', emptyPatch.status === 400);

  // routing errors
  const missing = await call('GET', '/api/articles/nope-not-here');
  check('unknown slug → 404', missing.status === 404);
  const badRoute = await call('GET', '/api/nope');
  check('unknown API route → 404 JSON', badRoute.status === 404 && badRoute.json?.error?.code === 'not_found');
  const wrongMethod = await call('DELETE', '/api/articles');
  check('DELETE on collection → 405', wrongMethod.status === 405, `got ${wrongMethod.status}`);
  check('405 advertises Allow', (wrongMethod.headers.get('allow') || '').includes('GET'));

  // listing features
  const published = await call('GET', '/api/articles?status=published&limit=50');
  check('status filter returns only published', published.json?.data?.every((a) => a.status === 'published'));
  const byTag = await call('GET', '/api/articles?tag=sqlite&limit=50');
  check(
    'tag filter returns only matching articles',
    byTag.json?.data?.length >= 1 && byTag.json?.data?.every((a) => a.tags.includes('sqlite')),
    JSON.stringify(byTag.json?.data?.map((a) => a.tags)),
  );
  const search = await call('GET', '/api/articles?q=Entirely%20new%20body&limit=50');
  check('search finds content matches', search.json?.data?.length >= 1);
  const page = await call('GET', '/api/articles?limit=1&offset=1&sort=title');
  check('pagination honours limit', page.json?.data?.length === 1, `got ${page.json?.data?.length}`);
  check('pagination reports has_more', typeof page.json?.meta?.has_more === 'boolean');
  const badLimit = await call('GET', '/api/articles?limit=500');
  check('out-of-range limit → 400', badLimit.status === 400);
  const withContent = await call('GET', '/api/articles?include_content=true&limit=2');
  check('include_content=true returns bodies', withContent.json?.data?.every((a) => typeof a.content === 'string'));

  // tags
  const tagList = await call('GET', '/api/tags');
  check('GET /api/tags → 200', tagList.status === 200 && Array.isArray(tagList.json?.data));
  check('tags include counts', tagList.json?.data?.every((t) => typeof t.count === 'number'));

  // blogger
  const blogger = await call('GET', '/api/blogger');
  check('GET /api/blogger → 200', blogger.status === 200 && typeof blogger.json?.data?.name === 'string');
  const originalBio = blogger.json.data.bio;
  const bioUpdate = await call('PUT', '/api/blogger', { body: { bio: 'Updated by the smoke test.' } });
  check('PUT /api/blogger → 200', bioUpdate.status === 200 && bioUpdate.json?.data?.bio === 'Updated by the smoke test.');
  check('blogger update kept the name', bioUpdate.json?.data?.name === blogger.json.data.name);
  await call('PUT', '/api/blogger', { body: { bio: originalBio } });

  // delete
  const del = await call('DELETE', `/api/articles/${article.id}`);
  check('DELETE → 200', del.status === 200 && del.json?.data?.deleted === true);
  const afterDelete = await call('GET', `/api/articles/${article.id}`);
  check('deleted article is gone → 404', afterDelete.status === 404);
  const delSecond = await call('DELETE', `/api/articles/${secondId}`);
  check('cleanup: second test article deleted', delSecond.status === 200);
  const delFirst = await call('DELETE', `/api/articles/${firstClashId}`);
  check('cleanup: clashing-title article deleted', delFirst.status === 200);

  // CORS
  const preflight = await call('OPTIONS', '/api/articles', { headers: { origin: 'https://example.com' } });
  check('OPTIONS preflight → 204', preflight.status === 204, `got ${preflight.status}`);
  check('CORS allows writes', (preflight.headers.get('access-control-allow-methods') || '').includes('DELETE'));
}

main()
  .catch((err) => {
    failures.push(`unexpected error: ${err.stack || err}`);
  })
  .finally(() => {
    const total = passed + failures.length;
    console.log(`${passed}/${total} checks passed`);
    if (failures.length) {
      console.log('\nFailures:');
      for (const f of failures) console.log(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log('All checks passed.');
  });
