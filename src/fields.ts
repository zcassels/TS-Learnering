#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import fs from 'fs';

const token = process.env['GH_TOKEN'];
const octokit = new Octokit({auth: token});
const fieldToFind = process.argv[2] ?? 'Repository';
if (!fieldToFind) {
    console.log(`No field specified ${fieldToFind}`);
    process.exit(1);
}

// const authed = await res.users.getAuthenticated();
const fieldQuery = fs.readFileSync('./graphql/get_fields.gql').toString();
const res = await octokit.graphql(fieldQuery, {fieldName: fieldToFind});

res['__type']['fields'].forEach(field => {
    console.log(field['name']);
});

