#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import fs from 'fs';

const token = process.env['GH_TOKEN'];
const octokit = new Octokit({auth: token});

// const authed = await res.users.getAuthenticated();

const query = fs.readFileSync('./graphql/get_files.gql').toString();

const res = await octokit.graphql(query);

const resJson = JSON.stringify(res, null, 4);

fs.writeFileSync('./results/get_files.json', resJson);
console.log(resJson);
