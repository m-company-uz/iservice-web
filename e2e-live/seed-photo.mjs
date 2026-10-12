#!/usr/bin/env node
/**
 * Runs before the live build: makes sure the first branch the site shows has a facade photo,
 * uploaded the way the director does it (POST /branches/{id}/photo), so the build renders a
 * real CRM photo. A photo that is already there is left alone — this is the dev database.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CRM = process.env.LIVE_CRM_URL ?? process.env.CRM_API_URL ?? 'http://127.0.0.1:8080/api/v1';
const KEY = process.env.SITE_API_KEY ?? 'dev-site-key-change-me-0000000000000000';
const PASSWORD = process.env.SEED_PASSWORD ?? 'iservice123';
const fixture = join(dirname(fileURLToPath(import.meta.url)), '../mock-crm/fixtures/branch-photo.jpg');

const fail = (msg) => {
  console.error(`seed-photo: ${msg}`);
  process.exit(1);
};

const login = await fetch(`${CRM}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '901000001', password: PASSWORD }),
});
if (!login.ok) fail(`director login → ${login.status}`);
const { access_token: token } = await login.json();

const config = await fetch(`${CRM}/site/config`, { headers: { 'X-Site-Key': KEY } });
if (!config.ok) fail(`site config → ${config.status}`);
const [first] = (await config.json()).branches;
if (!first) fail('the CRM publishes no branches');
if (first.photo_file) {
  console.log(`seed-photo: ${first.name} already has a photo`);
  process.exit(0);
}

const form = new FormData();
form.append('file', new Blob([readFileSync(fixture)], { type: 'image/jpeg' }), 'facade.jpg');
const upload = await fetch(`${CRM}/branches/${first.id}/photo`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
if (!upload.ok) fail(`upload → ${upload.status} ${await upload.text()}`);
console.log(`seed-photo: uploaded a photo for ${first.name}`);
